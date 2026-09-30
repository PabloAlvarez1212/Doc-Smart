"""Inasistencia explícita del paciente: persistencia, permisos y atomicidad."""
from datetime import timedelta
from importlib import import_module
from unittest.mock import patch, PropertyMock
from zoneinfo import ZoneInfo

from django.contrib.auth.models import AnonymousUser
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone

from catalogos.models import Estado, Rol
from citas.models import Cita
from medicos.models import Medico, SolicitudValidacionMedico
from notificaciones.models import Notificacion
from chat_citas.models import Conversacion
from chat_citas.test_ciclo_vida import CicloFixture
from chat_citas.services import (
    obtenerEstadoConversacionService, puedeVerConversacionService,
    puedeEscribirConversacionService, habilitarConversacionAnticipadamenteService,
)
from chat_citas.tests import ChatFixture


class PersistenciaInasistenciaTests(ChatFixture):
    def test_campo_nullable_sin_fecha_inventada(self):
        self.assertIn('fecha_inasistencia', {f.name for f in Cita._meta.fields})
        field = Cita._meta.get_field('fecha_inasistencia')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)
        self.assertFalse(field.has_default())
        self.cita.refresh_from_db()
        self.assertIsNone(self.cita.fecha_inasistencia)


class MigracionInasistenciaTests(TransactionTestCase):
    target = ('citas', '0007_cita_fecha_inasistencia')

    def comprobar_migracion(self, existing):
        executor = MigrationExecutor(connection)
        self.assertIn(self.target, executor.loader.graph.nodes,
                      'Falta migración nueva para fecha_inasistencia y catálogo')
        latest = executor.loader.graph.leaf_nodes()
        try:
            before = [node for node in latest if node != self.target] + [('citas', '0006_cita_fecha_creacion')]
            executor.migrate(before)
            old = executor.loader.project_state(before).apps
            EstadoOld = old.get_model('catalogos', 'Estado')
            EstadoOld.objects.filter(nombre='inasistencia_paciente').delete()
            previous = EstadoOld.objects.create(nombre='inasistencia_paciente') if existing else None
            rol = old.get_model('catalogos', 'Rol').objects.create(nombre='prueba')
            specialty = old.get_model('medicos', 'Especialidad').objects.create(nombre='General')
            medico = old.get_model('medicos', 'Medico').objects.create(
                nombre='Medico', apellido='Migracion', fecha_nacimiento='1990-01-01',
                correo='m@example.test', cedula='m', id_rol=rol, id_especialidad=specialty)
            paciente = old.get_model('users', 'Usuario').objects.create(
                nombre='Paciente', apellido='Migracion', fecha_nacimiento='1990-01-01',
                estatura=1.7, peso=70, correo='p@example.test', cedula='p', id_rol=rol)
            estado = EstadoOld.objects.create(nombre='confirmada')
            OldCita = old.get_model('citas', 'Cita')
            historical = OldCita.objects.create(
                fecha_programada=timezone.now(), id_estado=estado, id_usuario=paciente, id_medico=medico)
            with_chat = OldCita.objects.create(
                fecha_programada=timezone.now(), id_estado=estado, id_usuario=paciente, id_medico=medico)
            conv = Conversacion.objects.create(cita_id=with_chat.pk)
            created = conv.fecha_creacion
            MigrationExecutor(connection).migrate([self.target])
            for pk in (historical.pk, with_chat.pk):
                current = Cita.objects.get(pk=pk)
                self.assertIsNone(current.fecha_inasistencia)
                self.assertEqual(current.id_estado_id, estado.pk)
            self.assertEqual(Conversacion.objects.count(), 1)
            conv.refresh_from_db()
            self.assertEqual(conv.fecha_creacion, created)
            self.assertIsNone(conv.fecha_cierre)
            self.assertEqual(Estado.objects.filter(nombre='inasistencia_paciente').count(), 1)
            if previous:
                self.assertEqual(Estado.objects.get(nombre='inasistencia_paciente').pk, previous.pk)
        finally:
            MigrationExecutor(connection).migrate(latest)

    def test_migracion_agrega_campo_y_catalogo_sin_backfill(self):
        self.comprobar_migracion(existing=False)

    def test_migracion_reutiliza_estado_existente_sin_duplicarlo(self):
        self.comprobar_migracion(existing=True)


class InasistenciaFixture(CicloFixture):
    def setUp(self):
        super().setUp()
        self.ausencia, _ = Estado.objects.get_or_create(nombre='inasistencia_paciente')
        self.reprogramada, _ = Estado.objects.get_or_create(nombre='reprogramada')
        self.cita.fecha_programada = self.now - timedelta(minutes=1)
        self.cita.save(update_fields=['fecha_programada'])

    def marcar(self, actor, pk=None):
        module = import_module('citas.services')
        self.assertTrue(hasattr(module, 'marcarInasistenciaPacienteService'),
                        'Falta transición explícita de inasistencia del paciente')
        return module.marcarInasistenciaPacienteService(self.cita.pk if pk is None else pk, actor)

    def assert_evidencia_intacta(self):
        self.assert_sin_cambios()
        self.assertIsNone(self.cita.fecha_inasistencia)


class TransicionInasistenciaTests(InasistenciaFixture):
    def comprobar_exito(self):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            data, code = self.marcar(self.doctors[1])
        self.assertEqual(code, 200)
        self.assertEqual(data['id'], self.cita.pk)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.ausencia)
        self.assertEqual(self.cita.fecha_inasistencia, self.now)
        self.assertTrue(timezone.is_aware(self.cita.fecha_inasistencia))
        self.assert_misma_conversacion()
        self.assertEqual(self.conv.fecha_cierre, self.cita.fecha_inasistencia)
        self.assertEqual(self.estado(), 'cerrado')
        self.assertFalse(Notificacion.objects.exists())
        self.assertEqual(callbacks, [])

    def test_propietario_aprobado_marca_confirmada_iniciada(self):
        self.comprobar_exito()

    def test_permite_reprogramada(self):
        Cita.objects.filter(pk=self.cita.pk).update(id_estado=self.reprogramada)
        self.comprobar_exito()

    def test_inicio_exacto_sin_periodo_de_gracia(self):
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now)
        self.comprobar_exito()

    def test_un_microsegundo_antes_del_inicio_se_rechaza(self):
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now + timedelta(microseconds=1))
        self.assertEqual(self.marcar(self.doctors[1])[1], 400)
        self.assert_evidencia_intacta()

    def test_bogota_y_utc_deciden_por_el_mismo_instante(self):
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now.astimezone(ZoneInfo('America/Bogota')))
        self.comprobar_exito()

    def test_paciente_ajeno_admin_y_anonimo_reciben_403(self):
        self.patients[0].id_rol = Rol.objects.create(nombre='admin')
        for actor in (self.patients[0], self.patients[1], self.doctors[0], AnonymousUser(), None):
            with self.subTest(actor=actor):
                self.assertEqual(self.marcar(actor)[1], 403)
                self.assert_evidencia_intacta()

    def test_paciente_propietario_no_puede_marcar(self):
        self.assertEqual(self.marcar(self.patients[0])[1], 403)
        self.assert_evidencia_intacta()

    def test_medico_no_autenticado_recibe_403(self):
        with patch.object(Medico, 'is_authenticated', new_callable=PropertyMock, return_value=False):
            self.assertEqual(self.marcar(self.doctors[1])[1], 403)
        self.assert_evidencia_intacta()

    def test_aprobacion_se_consulta_vigente_en_bd(self):
        for estado in ('pendiente', 'rechazado'):
            with self.subTest(estado=estado):
                SolicitudValidacionMedico.objects.filter(medico=self.doctors[1]).update(estado=estado)
                self.assertEqual(self.marcar(self.doctors[1])[1], 403)
                self.assert_evidencia_intacta()

    def test_medico_con_rol_admin_no_usa_flujo_clinico(self):
        admin = Rol.objects.create(nombre='admin')
        Medico.objects.filter(pk=self.doctors[1].pk).update(id_rol=admin)
        self.assertEqual(self.marcar(self.doctors[1])[1], 403)
        self.assert_evidencia_intacta()

    def test_estados_incompatibles_rechazados_sin_mutacion(self):
        states = [self.states[n] for n in ('pendiente', 'cancelada', 'completada')]
        states += [self.ausencia, Estado.objects.create(nombre='otro_estado')]
        for estado in states:
            with self.subTest(estado=estado.nombre):
                Cita.objects.filter(pk=self.cita.pk).update(id_estado=estado)
                self.assertEqual(self.marcar(self.doctors[1])[1], 400)
                self.cita.refresh_from_db()
                self.assertEqual(self.cita.id_estado, estado)
                self.assertIsNone(self.cita.fecha_inasistencia)
                self.conv.refresh_from_db()
                self.assertIsNone(self.conv.fecha_cierre)

    def test_segundo_intento_no_sobrescribe_timestamp_ni_cierre(self):
        self.comprobar_exito()
        with patch('citas.services.timezone.now', return_value=self.now + timedelta(days=1)):
            self.assertEqual(self.marcar(self.doctors[1])[1], 400)
        self.cita.refresh_from_db()
        self.conv.refresh_from_db()
        self.assertEqual(self.cita.fecha_inasistencia, self.now)
        self.assertEqual(self.conv.fecha_cierre, self.now)

    def test_evidencia_previa_impide_sobrescritura_aun_con_estado_inconsistente(self):
        old = self.now - timedelta(days=1)
        Cita.objects.filter(pk=self.cita.pk).update(fecha_inasistencia=old)
        self.assertEqual(self.marcar(self.doctors[1])[1], 400)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.fecha_inasistencia, old)

    def test_cita_sin_conversacion_no_crea_una(self):
        self.conv.delete()
        self.assertEqual(self.marcar(self.doctors[1])[1], 200)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.fecha_inasistencia, self.now)
        self.assertFalse(Conversacion.objects.exists())

    def test_cierre_previo_usa_instante_exacto_de_transicion_valida(self):
        Conversacion.objects.filter(pk=self.conv.pk).update(fecha_cierre=self.now - timedelta(hours=1))
        self.comprobar_exito()

    def test_una_lectura_de_reloj_para_decision_y_ambas_fechas(self):
        module = import_module('citas.services')
        self.assertTrue(hasattr(module, 'marcarInasistenciaPacienteService'))
        with patch('citas.services.timezone.now', side_effect=[self.now, self.now + timedelta(seconds=1)]):
            self.assertEqual(self.marcar(self.doctors[1])[1], 200)
        self.cita.refresh_from_db()
        self.conv.refresh_from_db()
        self.assertEqual(self.cita.fecha_inasistencia, self.now)
        self.assertEqual(self.conv.fecha_cierre, self.now)

    def test_reloj_naive_rechazado_sin_guardar_fecha(self):
        with patch('citas.services.timezone.now', return_value=self.now.replace(tzinfo=None)):
            self.assertEqual(self.marcar(self.doctors[1])[1], 400)
        self.assert_evidencia_intacta()

    def test_inexistente_recibe_404(self):
        self.assertEqual(self.marcar(self.doctors[1], pk=-1)[1], 404)

    def test_catalogo_ausente_no_crea_estado_durante_accion(self):
        self.ausencia.delete()
        self.assertEqual(self.marcar(self.doctors[1])[1], 500)
        self.assertFalse(Estado.objects.filter(nombre='inasistencia_paciente').exists())
        self.assert_evidencia_intacta()

    def test_fallo_despues_de_cerrar_revierte_cita_y_conversacion(self):
        original = self.service('cerrarConversacionPorInasistenciaPacienteService')
        def fail(cita):
            original(cita)
            raise RuntimeError('fallo al cerrar')
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            with patch('chat_citas.services.cerrarConversacionPorInasistenciaPacienteService', side_effect=fail):
                with self.assertRaisesMessage(RuntimeError, 'fallo al cerrar'):
                    self.marcar(self.doctors[1])
        self.assert_evidencia_intacta()
        self.assertEqual(callbacks, [])

    def test_participantes_siguen_viendo_pero_no_escriben(self):
        self.comprobar_exito()
        for actor in (self.patients[0], self.doctors[1]):
            self.assertTrue(puedeVerConversacionService(self.conv, actor))
            self.assertFalse(puedeEscribirConversacionService(self.conv, actor))
        for actor in (self.patients[1], self.doctors[0]):
            self.assertFalse(puedeVerConversacionService(self.conv, actor))
            self.assertFalse(puedeEscribirConversacionService(self.conv, actor))
        self.assertEqual(habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctors[1])[1], 400)

    def test_tiempo_sin_accion_explicita_no_marca_inasistencia(self):
        with patch('citas.services.timezone.now', return_value=self.now + timedelta(days=10)):
            self.assertEqual(obtenerEstadoConversacionService(self.conv)['estado'], 'activo')
            self.assertTrue(puedeEscribirConversacionService(self.conv, self.patients[0]))
        self.assert_evidencia_intacta()


class InasistenciaTerminalTests(InasistenciaFixture):
    def setUp(self):
        super().setUp()
        self.assertEqual(self.marcar(self.doctors[1])[1], 200)

    def comprobar_rechazo(self, operation, expected=400):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.assertEqual(operation()[1], expected)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.ausencia)
        self.assertEqual(self.cita.fecha_inasistencia, self.now)
        self.assert_misma_conversacion()
        self.assertEqual(self.conv.fecha_cierre, self.now)
        self.assertEqual(self.estado(), 'cerrado')
        self.assertFalse(Notificacion.objects.exists())
        self.assertEqual(callbacks, [])

    def test_confirmar_no_reactiva_inasistencia(self):
        from citas.services import confirmarCitaService
        self.comprobar_rechazo(lambda: confirmarCitaService(self.cita.pk, self.doctors[1].pk))

    def test_cancelar_no_sobrescribe_estado_ni_evidencia(self):
        from citas.services import cancelarCitaService
        self.comprobar_rechazo(lambda: cancelarCitaService(self.cita.pk, self.patients[0]))

    def test_completar_no_sustituye_transicion_clinica(self):
        from citas.services import completarCitaService
        self.comprobar_rechazo(lambda: completarCitaService(self.cita.pk, self.doctors[1].pk))

    def test_reprogramar_no_borra_evidencia(self):
        from citas.services import editarCitaService
        self.comprobar_rechazo(lambda: editarCitaService(
            self.cita.pk, {'fecha_programada': self.now + timedelta(days=3)}, self.doctors[1]))

    def test_bymax_medico_no_reactiva_por_ninguna_operacion(self):
        from chatbot.services.cita_service import CitaService
        for action in ('confirmar', 'cancelar', 'completar', 'reprogramar'):
            with self.subTest(action=action):
                self.comprobar_rechazo(lambda: CitaService.operar_medico(
                    self.doctors[1], self.cita.pk, action, self.now + timedelta(days=3)), expected=409)

    def test_bymax_paciente_no_cancela_inasistencia(self):
        from chatbot.services.cita_service import CitaService
        self.comprobar_rechazo(lambda: CitaService.cancelar(self.patients[0], self.cita))

    def test_bymax_paciente_no_reprograma_inasistencia(self):
        from chatbot.services.cita_service import CitaService
        self.comprobar_rechazo(lambda: CitaService.reprogramar(
            self.patients[0], self.cita, self.now + timedelta(days=3)))
