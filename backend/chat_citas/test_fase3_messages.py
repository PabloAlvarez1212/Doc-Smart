from uuid import uuid4
from datetime import timedelta
from .models import Mensaje
from .services import obtenerEstadoConversacionService
from .test_support import Fase3Fixture


class MessageTests(Fase3Fixture):
    def send(self, actor=None, **kwargs):
        send = self.api('message_services', 'enviarMensajeConversacionService')
        return send(self.conv.pk, actor or self.patient, **dict(
            {'client_message_id': uuid4(), 'contenido': 'hola'}, **kwargs))

    def test_texto_trim_limite_y_emisor(self):
        result = self.send(contenido='  hola\n mundo  ')
        self.assertTrue(result.created)
        self.assertEqual(result.mensaje.contenido, 'hola\n mundo')
        self.assertEqual(result.mensaje.emisor_usuario_id, self.patient.pk)
        self.send(contenido='x' * 4000)
        error = self.api('exceptions', 'ChatError')
        for text in (' ' * 2, 'x' * 4001):
            with self.assertRaises(error):
                self.send(contenido=text)

    def test_retry_recupera_despues_cierre_y_conflicto(self):
        uid = uuid4()
        first = self.send(client_message_id=uid)
        self.conv.fecha_cierre = self.now
        self.conv.save()
        retry = self.send(client_message_id=uid, contenido=' hola ')
        self.assertEqual(first.mensaje.pk, retry.mensaje.pk)
        self.assertFalse(retry.created)
        self.assertEqual(Mensaje.objects.count(), 1)
        error = self.api('exceptions', 'ChatError')
        with self.assertRaises(error) as exc:
            self.send(client_message_id=uid, contenido='otro')
        self.assertEqual(exc.exception.status, 409)
        with self.assertRaises(error) as exc:
            self.send()
        self.assertEqual(exc.exception.status, 403)

    def test_nota_unica_no_activa_y_retry_tras_activacion(self):
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        uid = uuid4()
        first = self.send(modalidad='nota_previa', client_message_id=uid)
        self.conv.refresh_from_db()
        self.assertEqual(obtenerEstadoConversacionService(self.conv)['estado'], 'programado')
        error = self.api('exceptions', 'ChatError')
        with self.assertRaises(error) as exc:
            self.send(modalidad='nota_previa')
        self.assertEqual(exc.exception.status, 409)
        self.cita.fecha_programada = self.now
        self.cita.save()
        retry = self.send(modalidad='nota_previa', client_message_id=uid)
        self.assertEqual(retry.mensaje.pk, first.mensaje.pk)
        self.conv.fecha_cierre = self.now
        self.conv.save()
        with self.captureOnCommitCallbacks(execute=False) as callbacks:
            retry = self.send(modalidad='nota_previa', client_message_id=uid)
        self.assertFalse(retry.created)
        self.assertEqual(retry.mensaje.pk, first.mensaje.pk)
        self.assertEqual(callbacks, [])

    def test_no_medico_nota_ni_mensaje_programado(self):
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        send = self.api('message_services', 'enviarMensajeConversacionService')
        error = self.api('exceptions', 'ChatError')
        for actor, modality in ((self.doctor, 'nota_previa'), (self.patient, 'mensaje')):
            with self.assertRaises(error):
                send(self.conv.pk, actor, client_message_id=uuid4(), contenido='hola', modalidad=modality)

    def test_retry_no_avanza_lectura_y_no_revela_a_ajeno(self):
        uid = uuid4()
        self.send(client_message_id=uid)
        self.send(client_message_id=uid)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.ultimo_leido_paciente_id)
        error = self.api('exceptions', 'ChatError')
        with self.assertRaises(error):
            self.send(self.patients[1], client_message_id=uid)
