from uuid import uuid4
from datetime import timedelta
from unittest.mock import patch
from django.db import transaction
from notificaciones.models import Notificacion
from .models import Mensaje
from .message_services import enviarMensajeConversacionService
from .read_services import marcarLecturaConversacionService
from .test_support import Fase3Fixture


class NotificationTests(Fase3Fixture):
    def send(self, **kwargs):
        return enviarMensajeConversacionService(self.conv.pk, self.patient,
            **dict({'client_message_id': uuid4(), 'contenido': 'secreto clínico'}, **kwargs))

    def test_sistema_no_suprime_primer_humano_y_consecutivos_solo_una(self):
        Mensaje.objects.create(conversacion=self.conv, tipo='sistema', clave_evento='reprogramada')
        first = self.send()
        self.assertEqual(Notificacion.objects.count(), 1)
        for _ in range(3):
            self.send()
        self.assertEqual(Notificacion.objects.count(), 1)
        notice = Notificacion.objects.get()
        self.assertEqual(notice.id_medico_id, self.doctor.pk)
        self.assertEqual(notice.conversacion_id, self.conv.pk)
        self.assertNotIn(first.mensaje.contenido, notice.mensaje)

    def test_lectura_y_nuevo_humano_nueva_notificacion(self):
        first = self.send()
        marcarLecturaConversacionService(self.conv.pk, self.doctor, first.mensaje.pk)
        self.send()
        self.assertEqual(Notificacion.objects.count(), 2)

    def test_retry_cerrado_no_notifica(self):
        uid = uuid4()
        self.send(client_message_id=uid)
        self.assertEqual(Notificacion.objects.count(), 1)
        self.conv.fecha_cierre = self.now
        self.conv.save()
        self.send(client_message_id=uid)
        self.assertEqual(Notificacion.objects.count(), 1)

    def test_nota_notifica_una_vez_con_sistema_pendiente(self):
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        Mensaje.objects.create(conversacion=self.conv, tipo='sistema', clave_evento='reprogramada')
        uid = uuid4()
        self.send(modalidad='nota_previa', client_message_id=uid)
        self.send(modalidad='nota_previa', client_message_id=uid)
        self.assertEqual(Notificacion.objects.count(), 1)

    def test_rollback_revierte_mensaje_y_aviso(self):
        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                self.send()
                self.assertEqual(Notificacion.objects.count(), 1)
                raise RuntimeError('fallo posterior')
        self.assertEqual(Mensaje.objects.count(), 0)
        self.assertEqual(Notificacion.objects.count(), 0)
