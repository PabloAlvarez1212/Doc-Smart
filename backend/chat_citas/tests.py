from datetime import datetime, timedelta, timezone as dt_timezone
from importlib import import_module
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.apps import apps
from django.contrib.auth.models import AnonymousUser
from django.db import IntegrityError, transaction
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from catalogos.models import Estado, Rol
from citas.models import Cita
from citas.services import confirmarCitaService
from citas.views import CitaConfirmarView
from notificaciones.models import Notificacion
from medicos.models import Especialidad, Medico, SolicitudValidacionMedico
from storage_app.models import Archivo
from users.models import Usuario


class ChatFixture(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.now = datetime(2027, 1, 10, 15, tzinfo=dt_timezone.utc)
        cls.states = {name: Estado.objects.create(nombre=name) for name in
                      ('pendiente', 'confirmada', 'cancelada', 'completada')}
        patient_role = Rol.objects.create(nombre='paciente')
        doctor_role = Rol.objects.create(nombre='doctor')
        specialty = Especialidad.objects.create(nombre='General')
        cls.patients = [Usuario.objects.create(
            pk=pk, nombre='Paciente', apellido='Prueba', fecha_nacimiento='1990-01-01',
            estatura=1.7, peso=70, correo=f'p{pk}@example.test', cedula=f'p{pk}',
            id_rol=patient_role) for pk in (101, 102)]
        cls.doctors = []
        for pk in (101, 102):
            doctor = Medico.objects.create(
                pk=pk, nombre='Medico', apellido='Prueba', fecha_nacimiento='1990-01-01',
                correo=f'm{pk}@example.test', cedula=f'm{pk}', id_rol=doctor_role,
                id_especialidad=specialty)
            document = Archivo.objects.create(medico=doctor, storage_key=f'test/{pk}',
                                             nombre_original='cv.pdf', categoria='hoja_vida')
            SolicitudValidacionMedico.objects.create(medico=doctor, hoja_vida=document,
                                                     estado='aprobado')
            cls.doctors.append(doctor)
        cls.cita = Cita.objects.create(
            id_usuario=cls.patients[0], id_medico=cls.doctors[1],
            id_estado=cls.states['confirmada'], fecha_programada=cls.now + timedelta(days=3))

    def model(self):
        self.assertTrue(apps.is_installed('chat_citas'), 'Falta registrar chat_citas')
        return apps.get_model('chat_citas', 'Conversacion')

    def service(self, name):
        module = import_module('chat_citas.services')
        self.assertTrue(hasattr(module, name), f'Falta servicio {name}')
        return getattr(module, name)


class PreparacionTests(ChatFixture):
    def prepare(self, pk):
        self.model()
        return self.service('prepararConversacionService')(pk)

    def test_confirmada_crea_una_y_reintento_reutiliza(self):
        first, status = self.prepare(self.cita.pk)
        self.assertEqual(status, 201)
        second, status = self.prepare(self.cita.pk)
        self.assertEqual(status, 200)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(self.model().objects.filter(cita=self.cita).count(), 1)
        self.assertEqual(first.cita.id_usuario, self.patients[0])
        self.assertEqual(first.cita.id_medico, self.doctors[1])

    def test_pendiente_no_crea_y_lee_estado_vigente(self):
        Cita.objects.filter(pk=self.cita.pk).update(id_estado=self.states['pendiente'])
        self.assertEqual(self.prepare(self.cita.pk)[1], 400)
        self.assertFalse(self.model().objects.exists())

    def test_inexistente(self):
        self.assertEqual(self.prepare(-1)[1], 404)

    def test_unicidad_en_base_de_datos(self):
        self.prepare(self.cita.pk)
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.model().objects.create(cita=self.cita)


class EstadoTests(ChatFixture):
    def setUp(self):
        self.conv = self.model().objects.create(cita=self.cita)

    def state(self, now=None):
        service = self.service('obtenerEstadoConversacionService')
        with patch('chat_citas.services.timezone.now', return_value=now or self.now):
            return service(self.conv)

    def test_limite_inclusivo_y_transicion_sin_escrituras(self):
        self.cita.fecha_programada = self.now + timedelta(hours=24)
        for delta, expected in ((-1, 'programado'), (0, 'activo'), (1, 'activo')):
            with self.subTest(delta=delta), self.assertNumQueries(0):
                result = self.state(self.now + timedelta(microseconds=delta))
                self.assertEqual(result['estado'], expected)
                self.assertEqual(result['fecha_habilitacion_automatica'], self.now)
                self.assertIsNone(result['fecha_habilitacion_anticipada'])
                self.assertIsNone(result['fecha_cierre'])
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)

    def test_prioridades_estado_cierre_y_habilitacion(self):
        self.conv.fecha_habilitacion_anticipada = self.now
        self.assertEqual(self.state()['estado'], 'activo')
        self.conv.fecha_cierre = self.now
        self.assertEqual(self.state()['estado'], 'cerrado')
        self.cita.id_estado = self.states['cancelada']
        self.assertEqual(self.state()['estado'], 'cerrado')
        self.cita.id_estado = self.states['completada']
        self.assertEqual(self.state()['estado'], 'cerrado')
        self.cita.id_estado = self.states['pendiente']
        self.assertIsNone(self.state()['estado'])

    def test_pendiente_preparada_sin_marcas_no_disponible(self):
        self.cita.id_estado = self.states['pendiente']
        self.assertIsNone(self.state()['estado'])

    def test_confirmada_pasada_sigue_activa(self):
        self.cita.fecha_programada = self.now - timedelta(days=3)
        self.assertEqual(self.state()['estado'], 'activo')

    def test_mismo_instante_bogota_utc(self):
        self.cita.fecha_programada = (self.now + timedelta(hours=24)).astimezone(ZoneInfo('America/Bogota'))
        self.assertEqual(self.state(), self.state(self.now.astimezone(ZoneInfo('America/Bogota'))))
        self.assertEqual(self.state()['estado'], 'activo')

    def test_ventana_son_24_horas_transcurridas_en_cambio_horario(self):
        self.cita.fecha_programada = datetime(2027, 3, 14, 12, tzinfo=ZoneInfo('America/New_York'))
        result = self.state(datetime(2027, 3, 13, 16, tzinfo=dt_timezone.utc))
        self.assertEqual(result['estado'], 'activo')
        self.assertEqual(result['fecha_habilitacion_automatica'], datetime(2027, 3, 13, 16, tzinfo=dt_timezone.utc))

    def test_fechas_naive_rechazadas(self):
        naive = self.now.replace(tzinfo=None)
        for target in ('fecha_programada', 'fecha_habilitacion_anticipada', 'fecha_cierre', 'now'):
            with self.subTest(target=target):
                obj = self.cita if target == 'fecha_programada' else self.conv
                if target == 'now':
                    with self.assertRaises(ValueError):
                        self.state(naive)
                else:
                    old = getattr(obj, target)
                    setattr(obj, target, naive)
                    with self.assertRaises(ValueError):
                        self.state()
                    setattr(obj, target, old)


class AutorizacionTests(ChatFixture):
    def setUp(self):
        self.conv = self.model().objects.create(cita=self.cita)
        self.clock = patch('chat_citas.services.timezone.now', return_value=self.now)
        self.clock.start()
        self.addCleanup(self.clock.stop)

    def access(self, actor):
        return self.service('puedeAccederConversacionService')(self.conv, actor)

    def enable(self, actor=None, pk=None):
        return self.service('habilitarConversacionAnticipadamenteService')(
            self.conv.pk if pk is None else pk, self.doctors[1] if actor is None else actor)

    def test_activa_solo_participantes_por_tipo_y_pk(self):
        self.conv.fecha_habilitacion_anticipada = self.now
        self.assertTrue(self.access(self.patients[0]))
        self.assertTrue(self.access(self.doctors[1]))
        # Ambos ajenos tienen el mismo ID que un participante de la otra tabla.
        for actor in (self.patients[1], self.doctors[0], AnonymousUser(), None):
            with self.subTest(actor=actor):
                self.assertFalse(self.access(actor))

    def test_admin_y_medico_no_aprobado_sin_acceso(self):
        self.conv.fecha_habilitacion_anticipada = self.now
        self.patients[0].id_rol = Rol.objects.create(nombre='admin')
        self.assertFalse(self.access(self.patients[0]))
        SolicitudValidacionMedico.objects.filter(medico=self.doctors[1]).update(estado='pendiente')
        self.assertFalse(self.access(self.doctors[1]))
        self.assertEqual(self.enable()[1], 403)

    def test_programada_cerrada_pendiente_sin_acceso(self):
        self.assertFalse(self.access(self.patients[0]))
        self.assertFalse(self.access(self.doctors[1]))
        self.conv.fecha_cierre = self.now
        self.assertFalse(self.access(self.doctors[1]))
        self.conv.fecha_cierre = None
        self.conv.fecha_habilitacion_anticipada = self.now
        self.cita.id_estado = self.states['pendiente']
        self.assertFalse(self.access(self.patients[0]))
        self.assertFalse(self.access(self.doctors[1]))

    def test_habilita_y_reintento_conserva_fecha_original(self):
        result, status = self.enable()
        self.assertEqual(status, 200)
        self.assertEqual(result.pk, self.conv.pk)
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_habilitacion_anticipada, self.now)
        with patch('chat_citas.services.timezone.now', return_value=self.now + timedelta(days=3)):
            self.assertEqual(self.enable()[1], 200)
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_habilitacion_anticipada, self.now)

    def test_ajenos_paciente_y_anonimo_no_habilitan(self):
        for actor in (self.patients[0], self.patients[1], self.doctors[0], AnonymousUser()):
            with self.subTest(actor=actor):
                self.assertEqual(self.enable(actor)[1], 403)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)

    def test_pendiente_y_cerrada_rechazadas_con_estado_vigente(self):
        Cita.objects.filter(pk=self.cita.pk).update(id_estado=self.states['pendiente'])
        self.assertEqual(self.enable()[1], 400)
        Cita.objects.filter(pk=self.cita.pk).update(id_estado=self.states['confirmada'])
        self.model().objects.filter(pk=self.conv.pk).update(fecha_cierre=self.now)
        self.assertEqual(self.enable()[1], 400)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)

    def test_automatica_no_fabrica_auditoria_incluso_en_limite(self):
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now + timedelta(hours=24))
        self.assertEqual(self.enable()[1], 400)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)

    def test_decision_y_auditoria_usan_el_mismo_instante_al_cruzar_limite(self):
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now + timedelta(hours=24))
        before = self.now - timedelta(microseconds=1)
        with patch('chat_citas.services.timezone.now', side_effect=[before, self.now]):
            self.assertEqual(self.enable()[1], 200)
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_habilitacion_anticipada, before)

    def test_inexistente(self):
        self.assertEqual(self.enable(pk=-1)[1], 404)

    def test_cambio_de_propietario_se_verifica_en_bd(self):
        Cita.objects.filter(pk=self.cita.pk).update(id_medico=self.doctors[0])
        self.assertEqual(self.enable()[1], 403)
        self.assertEqual(self.enable(self.doctors[0])[1], 200)


class ConfirmacionTests(ChatFixture):
    def setUp(self):
        self.cita.id_estado = self.states['pendiente']
        self.cita.save(update_fields=['id_estado'])

    def confirm(self, doctor=None):
        return confirmarCitaService(self.cita.pk, (doctor or self.doctors[1]).pk)

    def test_confirmacion_crea_conversacion_y_dos_notificaciones(self):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            data, status = self.confirm()
        self.assertEqual(status, 200)
        self.assertEqual(data['id'], self.cita.pk)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.states['confirmada'])
        self.assertEqual(self.model().objects.filter(cita=self.cita).count(), 1)
        self.assertEqual(Notificacion.objects.count(), 2)
        self.assertEqual(set(Notificacion.objects.values_list('id_usuario_id', 'id_medico_id')),
                         {(self.patients[0].pk, None), (None, self.doctors[1].pk)})
        self.assertEqual(len(callbacks), 2)
        with self.captureOnCommitCallbacks(execute=False) as second_callbacks:
            self.assertEqual(self.confirm()[1], 400)
        self.assertEqual(second_callbacks, [])
        self.assertEqual(Notificacion.objects.count(), 2)
        self.assertEqual(self.model().objects.count(), 1)

    def test_historica_confirmada_no_backfill(self):
        self.cita.id_estado = self.states['confirmada']
        self.cita.save(update_fields=['id_estado'])
        self.assertEqual(self.confirm()[1], 400)
        self.assertFalse(self.model().objects.exists())
        self.assertFalse(Notificacion.objects.exists())

    def test_rechazos_no_preparan_conversacion(self):
        self.assertEqual(self.confirm(self.doctors[0])[1], 404)
        for state in ('cancelada', 'completada'):
            self.cita.id_estado = self.states[state]
            self.cita.save(update_fields=['id_estado'])
            self.assertEqual(self.confirm()[1], 400)
        self.assertFalse(self.model().objects.exists())
        self.assertFalse(Notificacion.objects.exists())

    def test_preparacion_repetida_preserva_marcas(self):
        self.confirm()
        conv = self.model().objects.get(cita=self.cita)
        conv.fecha_habilitacion_anticipada = self.now
        conv.fecha_cierre = self.now + timedelta(hours=1)
        conv.save()
        result, status = self.service('prepararConversacionService')(self.cita.pk)
        self.assertEqual(status, 200)
        self.assertEqual(result.pk, conv.pk)
        conv.refresh_from_db()
        self.assertEqual(conv.fecha_habilitacion_anticipada, self.now)
        self.assertEqual(conv.fecha_cierre, self.now + timedelta(hours=1))

    def test_fallo_preparacion_revierte_cita_conversacion_y_notificaciones(self):
        real_prepare = self.service('prepararConversacionService')
        def fail_after_insert(pk):
            real_prepare(pk)
            raise RuntimeError('Fallo inyectado')
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            with patch('chat_citas.services.prepararConversacionService', side_effect=fail_after_insert):
                with self.assertRaisesMessage(RuntimeError, 'Fallo inyectado'):
                    self.confirm()
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.states['pendiente'])
        self.assertFalse(self.model().objects.exists())
        self.assertFalse(Notificacion.objects.exists())
        self.assertEqual(callbacks, [])

    def test_respuesta_fallida_de_preparacion_tambien_revierte(self):
        with patch('chat_citas.services.prepararConversacionService', return_value=('Fallo', 400)):
            with self.assertRaises(RuntimeError):
                self.confirm()
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.states['pendiente'])
        self.assertFalse(Notificacion.objects.exists())

    def test_endpoint_existente_conserva_permisos_y_crea_conversacion(self):
        def request(actor):
            req = APIRequestFactory().put('/api/citas/confirmar/', {}, format='json')
            if actor is not None:
                force_authenticate(req, user=actor)
            return CitaConfirmarView.as_view()(req, pk=self.cita.pk)

        for actor in (self.patients[0], None):
            self.assertIn(request(actor).status_code, (401, 403))
        self.assertEqual(request(self.doctors[0]).status_code, 404)
        SolicitudValidacionMedico.objects.filter(medico=self.doctors[1]).update(estado='pendiente')
        self.assertEqual(request(self.doctors[1]).status_code, 403)
        self.assertFalse(self.model().objects.exists())
        self.assertFalse(Notificacion.objects.exists())
        SolicitudValidacionMedico.objects.filter(medico=self.doctors[1]).update(estado='aprobado')
        self.assertEqual(request(self.doctors[1]).status_code, 200)
        self.assertEqual(self.model().objects.count(), 1)
