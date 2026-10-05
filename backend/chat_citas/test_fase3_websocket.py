from uuid import uuid4
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken
from .tests import ChatFixture
from .test_support import Fase3Fixture
from .models import Conversacion, Mensaje


class WebsocketTests(TransactionTestCase):
    def setUp(self):
        ChatFixture.setUpTestData.__func__(type(self))
        Fase3Fixture.setUp(self)

    def socket(self, actor=None, origin='http://localhost:5173'):
        from core.asgi import application
        token = AccessToken()
        actor = actor or self.patient
        token['user_id'], token['tipo'] = actor.pk, 'medico' if actor is self.doctor else 'usuario'
        from django.conf import settings
        allowed = settings.WEBSOCKET_ALLOWED_ORIGINS[0]
        if origin == 'http://localhost:5173':
            origin = allowed
        return WebsocketCommunicator(application, f'/ws/chat-citas/{self.conv.pk}/',
            headers=[(b'origin', origin.encode()), (b'cookie', ('token=' + str(token)).encode())])

    def test_conexion_propietario_ajeno_origen(self):
        async def run():
            for actor, allowed in ((self.patient, True), (self.doctor, True), (self.patients[1], False)):
                ws = self.socket(actor)
                try:
                    connected, _ = await ws.connect()
                    self.assertEqual(connected, allowed)
                finally:
                    await ws.disconnect()
            ws = self.socket(origin='https://evil.example')
            connected, _ = await ws.connect()
            self.assertFalse(connected)
            await ws.disconnect()
        async_to_sync(run)()

    def test_envio_retry_cerrado_conflicto(self):
        async def run():
            ws = self.socket()
            self.assertTrue((await ws.connect())[0])
            data = {'client_message_id': str(uuid4()), 'contenido': 'hola'}
            await ws.send_json_to({'event': 'chat.message.send', 'data': data})
            events = [await ws.receive_json_from(), await ws.receive_json_from()]
            ack = next(e for e in events if e['event'] == 'chat.message.ack')
            self.assertTrue(ack['data']['created'])
            await database_sync_to_async(Conversacion.objects.filter(pk=self.conv.pk).update)(fecha_cierre=self.now)
            await ws.send_json_to({'event': 'chat.message.send', 'data': data})
            retry = await ws.receive_json_from()
            self.assertEqual(retry['event'], 'chat.message.ack')
            self.assertFalse(retry['data']['created'])
            self.assertEqual(retry['data']['id'], ack['data']['id'])
            await ws.send_json_to({'event': 'chat.message.send', 'data': dict(data, contenido='otro')})
            self.assertEqual((await ws.receive_json_from())['data']['status'], 409)
            await ws.disconnect()
        async_to_sync(run)()
        self.assertEqual(Mensaje.objects.count(), 1)
