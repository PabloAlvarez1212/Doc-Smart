from datetime import timedelta
from uuid import uuid4
from unittest.mock import patch
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.test.utils import CaptureQueriesContext
from catalogos.models import Estado
from citas.models import Cita
from citas.services import editarCitaService, cancelarCitaService
from medicos.models import SolicitudValidacionMedico
from notificaciones.models import Notificacion
from .models import Mensaje, Conversacion
from .exceptions import ChatError
from .message_services import enviarMensajeConversacionService
from .read_services import marcarLecturaConversacionService
from .queries import listarConversacionesService
from .services import habilitarConversacionAnticipadamenteService
from .test_support import Fase3Fixture
from .tests import ChatFixture


class IntegrationTests(Fase3Fixture):
    def send(self, actor=None, **kwargs):
        return enviarMensajeConversacionService(self.conv.pk, actor or self.patient,
            **dict({'client_message_id': uuid4(), 'contenido': 'hola'}, **kwargs))

    def test_retry_revocado_no_revela_mensaje(self):
        uid = uuid4()
        self.send(self.doctor, client_message_id=uid)
        SolicitudValidacionMedico.objects.filter(medico=self.doctor).update(estado='rechazado')
        with self.assertRaises(ChatError) as exc:
            self.send(self.doctor, client_message_id=uid)
        self.assertEqual(exc.exception.status, 403)

    def test_limite_nota_exactamente_24_horas(self):
        self.cita.fecha_programada = self.now + timedelta(hours=24)
        self.cita.save()
        with self.assertRaises(ChatError):
            self.send(modalidad='nota_previa')
        self.assertTrue(self.send().created)

    def test_cancelacion_despues_envio_retry_y_nuevo(self):
        uid = uuid4()
        first = self.send(client_message_id=uid)
        cancelarCitaService(self.cita.pk, self.patient)
        counts = Mensaje.objects.count(), Notificacion.objects.count()
        retry = self.send(client_message_id=uid)
        self.assertEqual(first.mensaje.pk, retry.mensaje.pk)
        with self.assertRaises(ChatError):
            self.send()
        self.assertEqual(counts, (Mensaje.objects.count(), Notificacion.objects.count()))

    def test_reprogramacion_a_programado_conserva_retry(self):
        Estado.objects.get_or_create(nombre='reprogramada')
        uid = uuid4()
        self.send(client_message_id=uid)
        editarCitaService(self.cita.pk, {'fecha_programada': self.now + timedelta(days=3)}, self.patient)
        self.assertFalse(self.send(client_message_id=uid).created)
        with self.assertRaises(ChatError):
            self.send()

    def test_dos_habilitaciones_reales_mismo_reloj(self):
        Estado.objects.get_or_create(nombre='reprogramada')
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)
        editarCitaService(self.cita.pk, {'fecha_programada': self.now + timedelta(days=4)}, self.patient)
        habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)
        self.assertEqual(Mensaje.objects.filter(metadata__evento='chat_habilitado').count(), 2)

    def test_historia_sin_conversacion_no_crea_evento(self):
        self.conv.delete()
        cancelarCitaService(self.cita.pk, self.patient)
        self.assertFalse(Conversacion.objects.exists())
        self.assertFalse(Mensaje.objects.exists())

    def test_lectura_mensaje_otro_chat_no_avanza(self):
        other = Cita.objects.create(id_usuario=self.patient, id_medico=self.doctor,
            id_estado=self.states['confirmada'], fecha_programada=self.now)
        conv = Conversacion.objects.create(cita=other)
        msg = Mensaje.objects.create(conversacion=conv, tipo='sistema', clave_evento='test')
        with self.assertRaises(ChatError):
            marcarLecturaConversacionService(self.conv.pk, self.patient, msg.pk)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.ultimo_leido_paciente_id)

    def test_listado_no_n_mas_uno(self):
        self.send()
        with CaptureQueriesContext(connection) as small:
            listarConversacionesService(self.patient)
        for i in range(19):
            cita = Cita.objects.create(id_usuario=self.patient, id_medico=self.doctor,
                id_estado=self.states['confirmada'], fecha_programada=self.now + timedelta(minutes=i))
            conv = Conversacion.objects.create(cita=cita)
            Mensaje.objects.create(conversacion=conv, tipo='sistema', clave_evento='test')
        with CaptureQueriesContext(connection) as large:
            result = listarConversacionesService(self.patient)
        self.assertEqual(len(result['results']), 20)
        self.assertLessEqual(len(large), len(small) + 2)

    def test_fallo_difusion_no_desguarda_y_retry_no_reemite(self):
        uid = uuid4()
        with patch('chat_citas.realtime.get_channel_layer', side_effect=RuntimeError('offline')):
            with self.captureOnCommitCallbacks(execute=True):
                result = self.send(client_message_id=uid)
        self.assertTrue(Mensaje.objects.filter(pk=result.mensaje.pk).exists())
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            self.assertFalse(self.send(client_message_id=uid).created)
        self.assertEqual(callbacks, [])


class Fase3MigrationTests(TransactionTestCase):
    def test_migracion_sin_backfill(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        before = [('chat_citas', '0001_initial'), ('notificaciones', '0001_initial')]
        try:
            executor.migrate(before)
            old = MigrationExecutor(connection).loader.project_state(before).apps
            ChatFixture.setUpTestData.__func__(type(self))
            conv = old.get_model('chat_citas', 'Conversacion').objects.create(cita_id=self.cita.pk)
            previous = conv.fecha_creacion
            MigrationExecutor(connection).migrate(latest)
            current = Conversacion.objects.get(pk=conv.pk)
            self.assertEqual(current.fecha_creacion, previous)
            self.assertIsNone(current.ultimo_leido_paciente_id)
            self.assertFalse(Mensaje.objects.exists())
            self.assertEqual(Conversacion.objects.count(), 1)
        finally:
            MigrationExecutor(connection).migrate(latest)
