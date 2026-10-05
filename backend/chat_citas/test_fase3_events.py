from datetime import timedelta
from unittest.mock import patch
from django.db import transaction
from django.test import TransactionTestCase
from catalogos.models import Estado
from citas.services import cancelarCitaService, editarCitaService, completarCitaService, marcarInasistenciaPacienteService
from .models import Mensaje
from .services import habilitarConversacionAnticipadamenteService
from .test_support import Fase3Fixture


class EventTests(Fase3Fixture):
    def test_todas_transiciones_revienten_si_evento_falla(self):
        Estado.objects.get_or_create(nombre='reprogramada')
        cases = [
            ('anticipada', self.now + timedelta(days=3), lambda: habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)),
            ('reprogramada', self.now, lambda: editarCitaService(self.cita.pk, {'fecha_programada': self.now + timedelta(days=4)}, self.patient)),
            ('completada', self.now, lambda: completarCitaService(self.cita.pk, self.doctor.pk)),
            ('inasistencia', self.now, lambda: marcarInasistenciaPacienteService(self.cita.pk, self.doctor)),
        ]
        for name, scheduled, operation in cases:
            with self.subTest(name=name):
                self.cita.fecha_programada = scheduled
                self.cita.save()
                with self.captureOnCommitCallbacks(execute=False) as callbacks:
                    with patch('chat_citas.event_services.registrarEventoConversacionService', side_effect=RuntimeError('fallo')):
                        with self.assertRaises(RuntimeError):
                            operation()
                self.cita.refresh_from_db()
                self.conv.refresh_from_db()
                self.assertEqual(self.cita.id_estado.nombre, 'confirmada')
                self.assertEqual(self.cita.fecha_programada, scheduled)
                self.assertIsNone(self.cita.fecha_final)
                self.assertIsNone(self.cita.fecha_inasistencia)
                self.assertIsNone(self.conv.fecha_habilitacion_anticipada)
                self.assertIsNone(self.conv.fecha_cierre)
                self.assertFalse(Mensaje.objects.exists())
                self.assertEqual(callbacks, [])

    def test_completada_cierre_derivado_no_crea_mas_eventos(self):
        from .services import obtenerEstadoConversacionService
        from notificaciones.models import Notificacion
        completarCitaService(self.cita.pk, self.doctor.pk)
        self.assertEqual(Notificacion.objects.count(), 2)
        self.conv.refresh_from_db()
        with patch('django.utils.timezone.now', return_value=self.now + timedelta(hours=24)):
            self.assertEqual(obtenerEstadoConversacionService(self.conv)['estado'], 'cerrado')
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_fallo_transicion_no_programa_eventos(self):
        self.cita.id_estado = self.states['completada']
        self.cita.save()
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            self.assertEqual(cancelarCitaService(self.cita.pk, self.patient)[1], 400)
        self.assertFalse(Mensaje.objects.exists())
        self.assertEqual(callbacks, [])


    def test_evento_interno_idempotente_y_historica_no_crea(self):
        from .event_services import registrarEventoConversacionService
        from .models import Conversacion
        with transaction.atomic():
            first = registrarEventoConversacionService(self.cita, clave='evento:1',
                evento='cita_reprogramada', metadata={'fecha_nueva': 'snapshot'}, instante=self.now)
            second = registrarEventoConversacionService(self.cita, clave='evento:1',
                evento='cita_reprogramada', metadata={'fecha_nueva': 'otro'}, instante=self.now)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(second.metadata['fecha_nueva'], 'snapshot')
        # Otra cita histórica sin chat: lectura del helper no inventa historial.
        from citas.models import Cita
        historical = Cita.objects.create(id_usuario=self.patient, id_medico=self.doctor,
            id_estado=self.states['confirmada'], fecha_programada=self.now)
        with transaction.atomic():
            self.assertIsNone(registrarEventoConversacionService(historical, clave='x',
                evento='cita_cancelada', metadata={}, instante=self.now))
        self.assertEqual(Conversacion.objects.count(), 1)

    def test_fallo_channels_tras_commit_preserva_evento(self):
        with patch('chat_citas.realtime.get_channel_layer', side_effect=RuntimeError('offline')):
            with self.assertLogs('chat_citas.realtime', level='ERROR'):
                with self.captureOnCommitCallbacks(execute=True):
                    completarCitaService(self.cita.pk, self.doctor.pk)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado.nombre, 'completada')
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_cancelacion_evento_atomico_unico(self):
        self.assertEqual(cancelarCitaService(self.cita.pk, self.patient)[1], 200)
        self.assertEqual(Mensaje.objects.filter(tipo='sistema').count(), 1)
        cancelarCitaService(self.cita.pk, self.patient)
        self.assertEqual(Mensaje.objects.count(), 1)
        msg = Mensaje.objects.get()
        self.assertEqual(msg.metadata['evento'], 'cita_cancelada')
        self.assertEqual(msg.metadata['actor']['tipo'], 'paciente')

    def test_evento_falla_revierte_cancelacion(self):
        self.api('event_services', 'registrarEventoConversacionService')
        with patch('chat_citas.event_services.registrarEventoConversacionService', side_effect=RuntimeError('fallo')):
            with self.assertRaises(RuntimeError):
                cancelarCitaService(self.cita.pk, self.patient)
        self.cita.refresh_from_db()
        self.assertEqual(self.cita.id_estado.nombre, 'confirmada')
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.fecha_cierre)

    def test_reprogramaciones_distintas_snapshots(self):
        Estado.objects.get_or_create(nombre='reprogramada')
        old = self.cita.fecha_programada
        new = old + timedelta(days=3)
        editarCitaService(self.cita.pk, {'fecha_programada': new}, self.patient)
        self.assertEqual(Mensaje.objects.count(), 1)
        first = Mensaje.objects.get()
        editarCitaService(self.cita.pk, {'fecha_programada': new}, self.patient)
        self.assertEqual(Mensaje.objects.count(), 1)
        editarCitaService(self.cita.pk, {'fecha_programada': old}, self.patient)
        self.assertEqual(Mensaje.objects.count(), 2)
        first.refresh_from_db()
        self.assertEqual(first.metadata['fecha_nueva'], new.isoformat())

    def test_completada_e_inasistencia_eventos(self):
        completarCitaService(self.cita.pk, self.doctor.pk)
        self.assertEqual(Mensaje.objects.count(), 1)
        self.assertEqual(Mensaje.objects.get().metadata['disponible_hasta'], (self.now + timedelta(hours=24)).isoformat())

    def test_inasistencia(self):
        self.cita.fecha_programada = self.now
        self.cita.save()
        marcarInasistenciaPacienteService(self.cita.pk, self.doctor)
        self.assertEqual(Mensaje.objects.count(), 1)
        self.assertEqual(Mensaje.objects.get().metadata['evento'], 'inasistencia_paciente')

    def test_habilitar_estricto_y_default(self):
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)
        self.assertEqual(Mensaje.objects.count(), 1)
        self.assertEqual(habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)[1], 200)
        self.assertEqual(habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor, estricto=True)[1], 409)
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_commit_emite_y_rollback_no(self):
        publish = self.api('realtime', 'programarEventoChat')
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with patch('chat_citas.realtime._emitir') as emit:
                with transaction.atomic():
                    publish(self.conv.pk, 'chat.test', {'id': 1})
        self.assertEqual(len(callbacks), 1)
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(RuntimeError), transaction.atomic():
                publish(self.conv.pk, 'chat.test', {})
                raise RuntimeError()
        self.assertEqual(callbacks, [])


class ClinicalCommitTests(TransactionTestCase):
    def setUp(self):
        from .tests import ChatFixture
        ChatFixture.setUpTestData.__func__(type(self))
        Fase3Fixture.setUp(self)

    def test_emision_solo_despues_del_commit_real(self):
        from .event_services import registrarEventoConversacionService
        with patch('chat_citas.realtime._emitir') as emit:
            with transaction.atomic():
                registrarEventoConversacionService(self.cita, clave='evento:commit',
                    evento='cita_reprogramada', metadata={}, instante=self.now)
                self.assertEqual(emit.call_count, 0)
            self.assertEqual(emit.call_count, 2)
        with patch('chat_citas.realtime._emitir') as emit:
            with self.assertRaises(RuntimeError), transaction.atomic():
                registrarEventoConversacionService(self.cita, clave='evento:rollback',
                    evento='cita_reprogramada', metadata={}, instante=self.now)
                raise RuntimeError('fallo antes de commit')
            self.assertEqual(emit.call_count, 0)
        self.assertFalse(Mensaje.objects.filter(clave_evento='evento:rollback').exists())
