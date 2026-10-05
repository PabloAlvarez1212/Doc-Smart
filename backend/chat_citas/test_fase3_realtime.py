from uuid import uuid4
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from django.core.cache import cache
from .test_fase3_websocket import WebsocketTests
from .models import Mensaje


class RealtimeTests(WebsocketTests):
    def test_typing_solo_otro_actor_y_lectura(self):
        cache.clear()
        msg = Mensaje.objects.create(conversacion=self.conv, tipo='paciente',
            emisor_usuario=self.patient, client_message_id=uuid4(), contenido='hola')
        async def run():
            patient, own_other, doctor = self.socket(), self.socket(), self.socket(self.doctor)
            for ws in (patient, own_other, doctor):
                self.assertTrue((await ws.connect())[0])
            await patient.send_json_to({'event': 'chat.typing', 'data': {'escribiendo': True}})
            event = await doctor.receive_json_from()
            self.assertEqual(event['event'], 'chat.typing')
            self.assertTrue(event['data']['escribiendo'])
            self.assertTrue(await patient.receive_nothing(timeout=0.1))
            self.assertTrue(await own_other.receive_nothing(timeout=0.1))
            await doctor.send_json_to({'event': 'chat.message.read', 'data': {'ultimo_mensaje_id': msg.pk}})
            event = await patient.receive_json_from()
            self.assertEqual(event['event'], 'chat.message.read')
            self.assertEqual(event['data']['ultimo_mensaje_id'], msg.pk)
            for ws in (patient, own_other, doctor):
                await ws.disconnect()
        async_to_sync(run)()
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.ultimo_leido_medico_id, msg.pk)
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_typing_cerrado_rechazado(self):
        self.conv.fecha_cierre = self.now
        self.conv.save()
        async def run():
            ws = self.socket()
            self.assertTrue((await ws.connect())[0])
            await ws.send_json_to({'event': 'chat.typing', 'data': {'escribiendo': True}})
            self.assertEqual((await ws.receive_json_from())['data']['status'], 403)
            await ws.disconnect()
        async_to_sync(run)()
