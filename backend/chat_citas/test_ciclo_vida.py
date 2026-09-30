"""Ciclo de vida de la misma conversación: pruebas de dominio e integración."""
from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch
from zoneinfo import ZoneInfo

from catalogos.models import Estado
from catalogos.models import Rol
from django.contrib.auth.models import AnonymousUser
from medicos.models import SolicitudValidacionMedico
from citas.models import Cita
from citas.services import cancelarCitaService, editarCitaService, completarCitaService
from notificaciones.models import Notificacion
from chat_citas.models import Conversacion
from chat_citas.services import obtenerEstadoConversacionService
from chat_citas.tests import ChatFixture


class CicloFixture(ChatFixture):
    def setUp(self):
        self.conv = Conversacion.objects.create(
            cita=self.cita, fecha_habilitacion_anticipada=self.now - timedelta(hours=1))
        self.original_pk = self.conv.pk
        self.original_creation = self.conv.fecha_creacion
        self.clock = patch('chat_citas.services.timezone.now', return_value=self.now)
        self.clock.start()
        self.addCleanup(self.clock.stop)

    def estado(self):
        self.conv.refresh_from_db()
        return obtenerEstadoConversacionService(self.conv)['estado']

    def assert_misma_conversacion(self):
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.pk, self.original_pk)
        self.assertEqual(self.conv.fecha_creacion, self.original_creation)
        self.assertEqual(Conversacion.objects.filter(cita=self.cita).count(), 1)

    def assert_sin_cambios(self):
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.states['confirmada'])
        self.assertIsNone(self.cita.fecha_cancelacion)
        self.assert_misma_conversacion()
        self.assertIsNone(self.conv.fecha_cierre)
        self.assertEqual(self.conv.fecha_habilitacion_anticipada, self.now - timedelta(hours=1))
        self.assertFalse(Notificacion.objects.exists())


class CancelacionChatTests(CicloFixture):
    def cancelar(self, actor=None):
        return cancelarCitaService(self.cita.pk, actor or self.patients[0])

    def comprobar_cancelacion(self, actor):
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.assertEqual(self.cancelar(actor)[1], 200)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.states['cancelada'])
        self.assert_misma_conversacion()
        self.assertEqual(self.conv.fecha_cierre, self.now)
        self.assertEqual(self.conv.fecha_cierre, self.cita.fecha_cancelacion)
        self.assertEqual(self.estado(), 'cerrado')
        self.assertEqual(Notificacion.objects.count(), 2)
        self.assertEqual(len(callbacks), 2)

    def test_cancelacion_por_paciente_cierra_en_instante_real(self):
        self.comprobar_cancelacion(self.patients[0])

    def test_cancelacion_por_medico_cierra_misma_conversacion(self):
        self.comprobar_cancelacion(self.doctors[1])

    def test_reintento_no_cambia_cierre_ni_notificaciones(self):
        self.cancelar()
        with patch('chat_citas.services.timezone.now', return_value=self.now + timedelta(hours=1)):
            self.assertEqual(self.cancelar()[1], 400)
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_cierre, self.now)
        self.assertEqual(Notificacion.objects.count(), 2)

    def test_rechazo_por_ajeno_incluye_colisiones_pk_y_no_cambia_chat(self):
        for actor in (self.patients[1], self.doctors[0]):
            with self.subTest(actor=actor):
                self.assertEqual(self.cancelar(actor)[1], 403)
                self.assert_sin_cambios()

    def test_sin_conversacion_no_crea_una(self):
        self.conv.delete()
        self.assertEqual(self.cancelar()[1], 200)
        self.assertFalse(Conversacion.objects.exists())

    def test_cierre_explicito_previo_no_se_sobrescribe(self):
        old = self.now - timedelta(days=1)
        Conversacion.objects.filter(pk=self.conv.pk).update(fecha_cierre=old)
        self.assertEqual(self.cancelar()[1], 200)
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_cierre, old)

    def test_fallo_chat_despues_de_guardar_revierte_transicion_completa(self):
        original = self.service('cerrarConversacionPorCancelacionService')
        def fail(cita):
            original(cita)
            raise RuntimeError('fallo chat')
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            with patch('chat_citas.services.cerrarConversacionPorCancelacionService', side_effect=fail):
                with self.assertRaisesMessage(RuntimeError, 'fallo chat'):
                    self.cancelar()
        self.assert_sin_cambios()
        self.assertEqual(callbacks, [])

    def test_fallo_notificacion_revierte_cita_y_cierre(self):
        from notificaciones.services import enviarNotificacion
        def fail(*args, **kwargs):
            enviarNotificacion(*args, **kwargs)
            raise RuntimeError('fallo notificacion')
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            with patch('citas.services.enviarNotificacion', side_effect=fail):
                with self.assertRaises(RuntimeError):
                    self.cancelar()
        self.assert_sin_cambios()
        self.assertEqual(callbacks, [])

    def test_completada_no_se_cancela_ni_altera_chat(self):
        Cita.objects.filter(pk=self.cita.pk).update(id_estado=self.states['completada'])
        self.assertEqual(self.cancelar()[1], 400)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_cierre)
        self.assertFalse(Notificacion.objects.exists())


class ReprogramacionChatTests(CicloFixture):
    def setUp(self):
        super().setUp()
        self.reprogramada = Estado.objects.create(nombre='reprogramada')
        self.original_date = self.cita.fecha_programada

    def reprogramar(self, fecha, actor=None):
        return editarCitaService(self.cita.pk, {'fecha_programada': fecha}, actor or self.patients[0])

    def comprobar_reprogramacion(self, delta, expected, actor=None):
        new = (self.now + delta).astimezone(ZoneInfo('America/Bogota'))
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.assertEqual(self.reprogramar(new, actor)[1], 200)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.fecha_programada, new)
        self.assertIsNotNone(self.cita.fecha_programada.utcoffset())
        self.assertEqual(self.cita.id_estado, self.reprogramada)
        self.assert_misma_conversacion()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)
        self.assertEqual(self.estado(), expected)
        self.assertEqual(Notificacion.objects.count(), 2)
        self.assertEqual(len(callbacks), 2)

    def test_fecha_mayor_24h_programada_con_misma_identidad(self):
        self.comprobar_reprogramacion(timedelta(hours=24, microseconds=1), 'programado')

    def test_exactamente_24h_activa(self):
        self.comprobar_reprogramacion(timedelta(hours=24), 'activo')

    def test_menor_24h_activa_medico_puede_reprogramar(self):
        self.comprobar_reprogramacion(timedelta(hours=24) - timedelta(microseconds=1),
                                     'activo', self.doctors[1])

    def test_fecha_igual_no_limpia_anticipacion(self):
        self.assertEqual(self.reprogramar(self.original_date)[1], 200)
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_habilitacion_anticipada, self.now - timedelta(hours=1))
        self.assertFalse(Notificacion.objects.exists())

    def test_sin_fecha_no_altera_conversacion(self):
        self.assertEqual(editarCitaService(self.cita.pk, {}, self.patients[0])[1], 200)
        self.assert_sin_cambios()

    def test_fecha_pasada_rechazada_conserva_marca(self):
        self.assertEqual(self.reprogramar(self.now - timedelta(hours=1))[1], 400)
        self.assert_sin_cambios()

    def test_fecha_naive_rechazada_sin_cambios(self):
        naive = (self.now + timedelta(hours=1)).replace(tzinfo=None)
        try:
            result = self.reprogramar(naive)
        except TypeError:
            self.fail('Una fecha naive debe rechazarse explícitamente, sin TypeError')
        self.assertEqual(result[1], 400)
        self.assert_sin_cambios()

    def test_actor_ajeno_no_modifica_fecha_ni_habilitacion(self):
        for actor in (self.patients[1], self.doctors[0]):
            self.assertEqual(self.reprogramar(self.now + timedelta(days=4), actor)[1], 404)
        self.assert_sin_cambios()

    def test_horario_ocupado_conserva_conversacion(self):
        new = self.now + timedelta(hours=2)
        Cita.objects.create(id_usuario=self.patients[1], id_medico=self.doctors[1],
                            id_estado=self.states['confirmada'], fecha_programada=new)
        self.assertEqual(self.reprogramar(new)[1], 400)
        self.assert_sin_cambios()

    def test_sin_estado_reprogramada_no_modifica_chat(self):
        self.reprogramada.delete()
        self.assertEqual(self.reprogramar(self.now + timedelta(days=4))[1], 404)
        self.assert_sin_cambios()

    def test_sin_conversacion_no_crea_una(self):
        self.conv.delete()
        self.assertEqual(self.reprogramar(self.now + timedelta(days=4))[1], 200)
        self.assertFalse(Conversacion.objects.exists())

    def test_medico_puede_habilitar_de_nuevo_tras_reprogramar(self):
        self.reprogramar(self.now + timedelta(days=4))
        later = self.now + timedelta(hours=1)
        with patch('chat_citas.services.timezone.now', return_value=later):
            self.assertEqual(self.service('habilitarConversacionAnticipadamenteService')(
                self.conv.pk, self.doctors[1])[1], 200)
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.fecha_habilitacion_anticipada, later)

    def test_reprogramacion_no_reabre_cierre_explicito(self):
        Conversacion.objects.filter(pk=self.conv.pk).update(fecha_cierre=self.now)
        self.assertEqual(self.reprogramar(self.now + timedelta(hours=2))[1], 200)
        self.assertEqual(self.estado(), 'cerrado')
        self.assertEqual(self.conv.fecha_cierre, self.now)
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)

    def test_fallo_chat_revierte_fecha_estado_y_marca(self):
        original = self.service('reiniciarConversacionPorReprogramacionService')
        def fail(cita):
            original(cita)
            raise RuntimeError('fallo chat')
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            with patch('chat_citas.services.reiniciarConversacionPorReprogramacionService', side_effect=fail):
                with self.assertRaises(RuntimeError):
                    self.reprogramar(self.now + timedelta(days=4))
        self.assert_sin_cambios()
        self.assertEqual(self.cita.fecha_programada, self.original_date)
        self.assertEqual(callbacks, [])

    def test_bymax_reutiliza_reprogramacion_y_conversacion(self):
        from chatbot.services.cita_service import CitaService
        self.assertEqual(CitaService.operar_medico(
            self.doctors[1], self.cita.pk, 'reprogramar', self.now + timedelta(days=4))[1], 200)
        self.assert_misma_conversacion()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)
        self.assertEqual(self.estado(), 'programado')


class CompletadaChatTests(CicloFixture):
    def completar(self, medico=None):
        return completarCitaService(self.cita.pk, (medico or self.doctors[1]).pk)

    def test_completar_usa_instante_real_no_fin_previsto_y_conserva_chat(self):
        planned = self.cita.fecha_programada + timedelta(minutes=30)
        Cita.objects.filter(pk=self.cita.pk).update(fecha_final=planned)
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.assertEqual(self.completar()[1], 200)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.fecha_final, self.now)
        self.assertNotEqual(self.cita.fecha_final, planned)
        self.assertEqual(self.cita.id_estado, self.states['completada'])
        self.assert_misma_conversacion()
        self.assertIsNone(self.conv.fecha_cierre)
        self.assertEqual(self.estado(), 'activo')
        result = obtenerEstadoConversacionService(self.conv)
        self.assertEqual(result['fecha_cierre_automatico'], self.now + timedelta(hours=24))
        self.assertEqual(len(callbacks), 2)
        self.assertEqual(Notificacion.objects.count(), 2)

    def test_ventana_postconsulta_limite_inclusivo_sin_escrituras(self):
        self.completar()
        self.conv.refresh_from_db()
        # Cargar relaciones antes de afirmar que el cálculo temporal no consulta ni escribe.
        self.conv.cita.id_estado
        deltas = ((timedelta(), 'activo'), (timedelta(hours=23, minutes=59, seconds=59), 'activo'),
                  (timedelta(hours=24) - timedelta(microseconds=1), 'activo'),
                  (timedelta(hours=24), 'cerrado'), (timedelta(hours=24, microseconds=1), 'cerrado'))
        for delta, expected in deltas:
            with self.subTest(delta=delta), patch('chat_citas.services.timezone.now', return_value=self.now + delta):
                with self.assertNumQueries(0):
                    self.assertEqual(obtenerEstadoConversacionService(self.conv)['estado'], expected)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_cierre)

    def test_completada_ignora_habilitacion_anticipada_vencida(self):
        self.completar()
        with patch('chat_citas.services.timezone.now', return_value=self.now + timedelta(days=2)):
            self.assertEqual(self.estado(), 'cerrado')

    def test_cierre_explicito_previo_no_se_reabre_al_completar(self):
        closed = self.now - timedelta(hours=1)
        Conversacion.objects.filter(pk=self.conv.pk).update(fecha_cierre=closed)
        self.assertEqual(self.completar()[1], 200)
        self.assertEqual(self.estado(), 'cerrado')
        self.assertEqual(self.conv.fecha_cierre, closed)

    def test_repeticion_completar_no_extiende_ventana(self):
        self.completar()
        with patch('chat_citas.services.timezone.now', return_value=self.now + timedelta(hours=24)):
            self.assertEqual(self.completar()[1], 400)
            self.assertEqual(self.estado(), 'cerrado')
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.fecha_final, self.now)
        self.assertEqual(Notificacion.objects.count(), 2)

    def test_ajeno_no_completa(self):
        self.assertEqual(self.completar(self.doctors[0])[1], 404)
        self.assert_sin_cambios()

    def test_fallo_despues_de_notificar_revierte_timestamp_estado_y_chat(self):
        planned = self.cita.fecha_programada + timedelta(minutes=30)
        Cita.objects.filter(pk=self.cita.pk).update(fecha_final=planned)
        from notificaciones.services import enviarNotificacion
        def fail(*args, **kwargs):
            enviarNotificacion(*args, **kwargs)
            raise RuntimeError('fallo al completar')
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            with patch('citas.services.enviarNotificacion', side_effect=fail):
                with self.assertRaises(RuntimeError):
                    self.completar()
        self.assert_sin_cambios()
        self.assertEqual(self.cita.fecha_final, planned)
        self.assertEqual(callbacks, [])

    def test_sin_conversacion_no_crea_una(self):
        self.conv.delete()
        self.assertEqual(self.completar()[1], 200)
        self.assertFalse(Conversacion.objects.exists())

    def test_completada_sin_instante_no_inventa_ventana(self):
        Cita.objects.filter(pk=self.cita.pk).update(id_estado=self.states['completada'], fecha_final=None)
        self.assertIsNone(self.estado())
        self.assertIsNone(obtenerEstadoConversacionService(self.conv)['fecha_cierre_automatico'])

    def test_habilitacion_no_reabre_ni_modifica_completada(self):
        self.completar()
        for marker in (self.now - timedelta(hours=1), None):
            with self.subTest(marker=marker):
                Conversacion.objects.filter(pk=self.conv.pk).update(fecha_habilitacion_anticipada=marker)
                self.assertEqual(self.service('habilitarConversacionAnticipadamenteService')(
                    self.conv.pk, self.doctors[1])[1], 400)
                self.conv.refresh_from_db()
                self.assertEqual(self.conv.fecha_habilitacion_anticipada, marker)

    def test_fecha_completada_naive_se_rechaza(self):
        self.cita.id_estado = self.states['completada']
        self.cita.fecha_final = self.now.replace(tzinfo=None)
        with self.assertRaises(ValueError):
            obtenerEstadoConversacionService(self.conv)

    def test_offsets_y_cambio_horario_representan_24h_transcurridas(self):
        completed = datetime(2027, 3, 13, 12, tzinfo=ZoneInfo('America/New_York'))
        self.cita.id_estado = self.states['completada']
        self.cita.fecha_final = completed
        closing = completed.astimezone(dt_timezone.utc) + timedelta(hours=24)
        for zone in (ZoneInfo('America/Bogota'), ZoneInfo('America/New_York'), dt_timezone.utc):
            with self.subTest(zone=zone), patch('chat_citas.services.timezone.now', return_value=closing.astimezone(zone)):
                result = obtenerEstadoConversacionService(self.conv)
                self.assertEqual(result['estado'], 'cerrado')
                self.assertEqual(result['fecha_cierre_automatico'], closing)

    def test_bymax_completa_con_el_mismo_instante_real(self):
        from chatbot.services.cita_service import CitaService
        self.assertEqual(CitaService.operar_medico(self.doctors[1], self.cita.pk, 'completar')[1], 200)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.fecha_final, self.now)
        self.assertEqual(self.estado(), 'activo')
        self.assert_misma_conversacion()


class VisibilidadEscrituraTests(CicloFixture):
    def ver(self, actor):
        return self.service('puedeVerConversacionService')(self.conv, actor)

    def escribir(self, actor):
        return self.service('puedeEscribirConversacionService')(self.conv, actor)

    def test_participantes_ven_programada_pero_no_escriben(self):
        self.conv.fecha_habilitacion_anticipada = None
        for actor in (self.patients[0], self.doctors[1]):
            with self.subTest(actor=actor):
                self.assertTrue(self.ver(actor))
                self.assertFalse(self.escribir(actor))

    def test_participantes_ven_y_escriben_activa(self):
        for actor in (self.patients[0], self.doctors[1]):
            self.assertTrue(self.ver(actor))
            self.assertTrue(self.escribir(actor))

    def test_cerrada_explicita_visible_sin_escritura(self):
        self.conv.fecha_cierre = self.now
        for actor in (self.patients[0], self.doctors[1]):
            self.assertTrue(self.ver(actor))
            self.assertFalse(self.escribir(actor))

    def test_cancelada_visible_sin_escritura(self):
        cancelarCitaService(self.cita.pk, self.patients[0])
        self.conv.refresh_from_db()
        for actor in (self.patients[0], self.doctors[1]):
            self.assertTrue(self.ver(actor))
            self.assertFalse(self.escribir(actor))

    def test_completada_al_limite_sigue_visible_sin_escritura(self):
        completarCitaService(self.cita.pk, self.doctors[1].pk)
        self.conv.refresh_from_db()
        for delta, can_write in ((timedelta(hours=23), True), (timedelta(hours=24), False)):
            with patch('chat_citas.services.timezone.now', return_value=self.now + delta):
                for actor in (self.patients[0], self.doctors[1]):
                    self.assertTrue(self.ver(actor))
                    self.assertEqual(self.escribir(actor), can_write)

    def test_ajenos_colisiones_pk_anonimo_y_admin_sin_acceso(self):
        for closure in (None, self.now):
            self.conv.fecha_cierre = closure
            for actor in (self.patients[1], self.doctors[0], AnonymousUser(), None):
                with self.subTest(closure=closure, actor=actor):
                    self.assertFalse(self.ver(actor))
                    self.assertFalse(self.escribir(actor))
        self.patients[0].id_rol = Rol.objects.create(nombre='admin')
        self.assertFalse(self.ver(self.patients[0]))
        self.assertFalse(self.escribir(self.patients[0]))

    def test_medico_no_aprobado_no_ve_ni_escribe(self):
        SolicitudValidacionMedico.objects.filter(medico=self.doctors[1]).update(estado='rechazado')
        self.assertFalse(self.ver(self.doctors[1]))
        self.assertFalse(self.escribir(self.doctors[1]))

    def test_no_disponible_no_se_muestra_ni_permite_escritura(self):
        for estado in (self.states['pendiente'], Estado.objects.create(nombre='desconocido')):
            self.cita.id_estado = estado
            for actor in (self.patients[0], self.doctors[1]):
                self.assertFalse(self.ver(actor))
                self.assertFalse(self.escribir(actor))

    def test_alias_de_fase1_mantiene_semantica_de_escritura(self):
        original = self.service('puedeAccederConversacionService')
        for marker, closed in ((None, None), (self.now, None), (self.now, self.now)):
            self.conv.fecha_habilitacion_anticipada = marker
            self.conv.fecha_cierre = closed
            for actor in (self.patients[0], self.doctors[1], self.patients[1]):
                self.assertEqual(original(self.conv, actor), self.escribir(actor))

    def test_hora_vencida_no_infiere_inasistencia_ni_cierra(self):
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now - timedelta(days=2))
        self.assertEqual(self.estado(), 'activo')
        self.assertTrue(self.escribir(self.patients[0]))
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado, self.states['confirmada'])
        self.assertIsNone(self.conv.fecha_cierre)


class BymaxPacienteCicloTests(CicloFixture):
    def test_cancelar_paciente_por_bymax_cierra_misma_conversacion(self):
        from chatbot.services.cita_service import CitaService
        self.assertEqual(CitaService.cancelar(self.patients[0], self.cita)[1], 200)
        self.assert_misma_conversacion()
        self.assertEqual(self.conv.fecha_cierre, self.now)
        self.assertEqual(self.estado(), 'cerrado')

    def test_reprogramar_paciente_por_bymax_reinicia_misma_conversacion(self):
        from chatbot.services.cita_service import CitaService
        Estado.objects.create(nombre='reprogramada')
        new = self.now + timedelta(days=4)
        self.assertEqual(CitaService.reprogramar(self.patients[0], self.cita, new)[1], 200)
        self.assert_misma_conversacion()
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)
        self.assertEqual(self.estado(), 'programado')

    def test_bymax_paciente_ajeno_no_cancela_ni_reprograma(self):
        from chatbot.services.cita_service import CitaService
        self.assertEqual(CitaService.cancelar(self.patients[1], self.cita)[1], 403)
        self.assertEqual(CitaService.reprogramar(
            self.patients[1], self.cita, self.now + timedelta(days=4))[1], 403)
        self.assert_sin_cambios()
