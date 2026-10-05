from uuid import uuid4
from datetime import timedelta
from django.db import connection
from django.test.utils import CaptureQueriesContext
from .models import Mensaje
from .test_support import Fase3Fixture


class ReadTests(Fase3Fixture):
    def test_cursor_monotono_propio_excluido_y_sistema(self):
        count = self.api('read_services', 'contarNoLeidos')
        read = self.api('read_services', 'marcarLecturaConversacionService')
        own = Mensaje.objects.create(conversacion=self.conv, tipo='paciente',
             emisor_usuario=self.patient, client_message_id=uuid4(), contenido='hola')
        incoming = Mensaje.objects.create(conversacion=self.conv, tipo='medico',
             emisor_medico=self.doctor, client_message_id=uuid4(), contenido='hola')
        system = Mensaje.objects.create(conversacion=self.conv, tipo='sistema', clave_evento='x')
        self.assertEqual(count(self.conv, self.patient), 2)
        self.assertEqual(count(self.conv, self.doctor), 2)
        result = read(self.conv.pk, self.patient, incoming.pk)
        self.assertEqual(result.no_leidos, 1)
        again = read(self.conv.pk, self.patient, own.pk)
        self.assertFalse(again.changed)
        self.assertEqual(again.ultimo_mensaje_id, incoming.pk)
        read(self.conv.pk, self.patient, system.pk)
        self.conv.refresh_from_db()
        self.assertEqual(count(self.conv, self.patient), 0)

    def test_lectura_inexistente_no_avanza(self):
        read = self.api('read_services', 'marcarLecturaConversacionService')
        error = self.api('exceptions', 'ChatError')
        with self.assertRaises(error):
            read(self.conv.pk, self.patient, 99999)
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.ultimo_leido_paciente_id)

    def test_nota_nueva_para_medico_y_lectura_sin_update_masivo(self):
        count = self.api('read_services', 'contarNoLeidos')
        read = self.api('read_services', 'marcarLecturaConversacionService')
        note = Mensaje.objects.create(conversacion=self.conv, tipo='nota_previa',
            emisor_usuario=self.patient, client_message_id=uuid4(), cupo_nota=1, contenido='nota')
        self.assertEqual(count(self.conv, self.patient), 0)
        self.assertEqual(count(self.conv, self.doctor), 1)
        with CaptureQueriesContext(connection) as captured:
            result = read(self.conv.pk, self.doctor, note.pk)
        self.assertEqual(result.no_leidos, 0)
        updates = [q['sql'] for q in captured if q['sql'].lstrip().upper().startswith('UPDATE')]
        self.assertEqual(len(updates), 1)
        self.assertIn('chat_citas_conversacion', updates[0])
        self.assertNotIn('UPDATE "chat_citas_mensaje"', updates[0])

    def test_lectura_disponible_programado_y_cerrado(self):
        read = self.api('read_services', 'marcarLecturaConversacionService')
        msg = Mensaje.objects.create(conversacion=self.conv, tipo='sistema', clave_evento='sistema')
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        self.assertTrue(read(self.conv.pk, self.patient, msg.pk).changed)
        self.conv.fecha_cierre = self.now
        self.conv.save()
        self.assertTrue(read(self.conv.pk, self.doctor, msg.pk).changed)
