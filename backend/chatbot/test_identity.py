from django.apps import apps
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from chatbot import test_medico as fixtures
from chatbot.identity_views import IdentidadBymaxView
from chatbot.models import SesionBymax


class IdentityTests(TestCase):
    setUpTestData = classmethod(fixtures.BymaxMedicoTests.setUpTestData.__func__)
    request = fixtures.BymaxMedicoTests.request

    def setUp(self):
        self.factory = APIRequestFactory()

    def test_identity_remains_available_without_tracking_fields(self):
        for actor in (self.pacientes[0], self.medicos[0]):
            response = self.request(IdentidadBymaxView, actor)
            self.assertEqual(response.status_code, 200)
            data = response.data['data']
            self.assertEqual(data['id'], actor.pk)
            self.assertIn(actor.nombre, data['saludo'])
            self.assertIn('diagnostico_autorizado', data)
            self.assertTrue({'animo', 'fecha', 'preguntar', 'puntuacion', 'pospuesto'}.isdisjoint(data))

    def test_identity_requires_authentication(self):
        request = self.factory.get('/api/chatbot/identidad/')
        self.assertIn(IdentidadBymaxView.as_view()(request).status_code, (401, 403))

    def test_identity_is_read_only_and_legacy_submissions_do_not_write(self):
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM chatbot_estadoanimodiario')
            before = cursor.fetchone()[0]
        for body in ({}, {'puntuacion': 7, 'confirmado': True}, {'accion': 'posponer'}):
            response = self.request(IdentidadBymaxView, self.pacientes[0], 'post', body)
            self.assertEqual(response.status_code, 405)
        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM chatbot_estadoanimodiario')
            self.assertEqual(cursor.fetchone()[0], before)

    def test_archived_records_do_not_block_account_deletion(self):
        old_apps = MigrationExecutor(connection).loader.project_state([('chatbot', '0009_estadoanimodiario_pospuesto_en')]).apps
        archive = old_apps.get_model('chatbot', 'EstadoAnimoDiario').objects.create(usuario_id=self.pacientes[0].pk, rol='paciente', fecha=timezone.localdate(), puntuacion=3)
        with transaction.atomic():
            self.pacientes[0].delete()
            connection.check_constraints()
        with connection.cursor() as cursor:
            cursor.execute('SELECT puntuacion FROM chatbot_estadoanimodiario WHERE id=%s', [archive.pk])
            self.assertEqual(cursor.fetchone()[0], 3)

    def test_archived_professional_records_survive_account_deletion(self):
        old_apps = MigrationExecutor(connection).loader.project_state([('chatbot', '0009_estadoanimodiario_pospuesto_en')]).apps
        from medicos.models import Medico
        actor = Medico.objects.create(nombre='Archivo', apellido='Médico', fecha_nacimiento='1980-01-01', correo='archive-doctor@example.com', contraseña='hash', cedula='archive-doctor', telefono='000', direccion='Prueba', id_rol=self.medicos[0].id_rol, id_especialidad=self.medicos[0].id_especialidad)
        archive = old_apps.get_model('chatbot', 'EstadoAnimoDiario').objects.create(medico_id=actor.pk, rol='medico', fecha=timezone.localdate(), puntuacion=9)
        with transaction.atomic():
            actor.delete()
            connection.check_constraints()
        with connection.cursor() as cursor:
            cursor.execute('SELECT puntuacion FROM chatbot_estadoanimodiario WHERE id=%s', [archive.pk])
            self.assertEqual(cursor.fetchone()[0], 9)

    def test_tracking_is_not_exposed_in_active_orm(self):
        with self.assertRaises(LookupError):
            apps.get_model('chatbot', 'EstadoAnimoDiario')
        self.assertNotIn('escala_animo', {field.name for field in SesionBymax._meta.get_fields()})


class ArchiveMigrationTests(TransactionTestCase):
    def test_retirement_and_reverse_preserve_historical_rows_and_columns(self):
        before = ('chatbot', '0009_estadoanimodiario_pospuesto_en')
        after = ('chatbot', '0010_retire_tracking_preserve_history')
        executor = MigrationExecutor(connection)
        executor.migrate([before])
        old_apps = executor.loader.project_state([before]).apps
        from catalogos.models import Rol as Role
        from users.models import Usuario as User
        role = Role.objects.create(nombre='paciente')
        user = User.objects.create(nombre='Archivo', apellido='Prueba', fecha_nacimiento='1990-01-01', estatura=1.7, peso=70, correo='archive@example.com', contraseña='hash', cedula='archive', telefono='000', id_rol_id=role.pk)
        record = old_apps.get_model('chatbot', 'EstadoAnimoDiario').objects.create(usuario_id=user.pk, rol='paciente', fecha=timezone.localdate(), puntuacion=3, pospuesto_en=timezone.now())
        session = old_apps.get_model('chatbot', 'SesionBymax').objects.create(usuario_id=user.pk, escala_animo=8)
        def snapshot():
            with connection.cursor() as cursor:
                cursor.execute('SELECT puntuacion, preguntado_en, respondido_en, pospuesto_en FROM chatbot_estadoanimodiario WHERE id=%s', [record.pk])
                daily = cursor.fetchone()
                cursor.execute('SELECT escala_animo FROM chatbot_sesion_bymax WHERE id=%s', [session.pk])
                return daily, cursor.fetchone()
        original = snapshot()
        try:
            executor = MigrationExecutor(connection)
            executor.migrate([after])
            self.assertEqual(snapshot(), original)
            retired = executor.loader.project_state([after]).apps
            with self.assertRaises(LookupError):
                retired.get_model('chatbot', 'EstadoAnimoDiario')
            self.assertNotIn('escala_animo', {field.name for field in retired.get_model('chatbot', 'SesionBymax')._meta.get_fields()})
            MigrationExecutor(connection).migrate([before])
            self.assertEqual(snapshot(), original)
        finally:
            MigrationExecutor(connection).migrate([after])
