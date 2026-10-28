from .test_transport import next_chat_event, no_chat_event
from uuid import uuid4
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken
from .tests import ChatFixture
from .test_support import Fase3Fixture
from .models import Conversacion, Mensaje
from django.test import override_settings


@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    },
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "docsmart-websocket-tests",
        }
    }
)
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
            events = [await next_chat_event(ws), await next_chat_event(ws)]
            ack = next(e for e in events if e['event'] == 'chat.message.ack')
            self.assertTrue(ack['data']['created'])
            await database_sync_to_async(Conversacion.objects.filter(pk=self.conv.pk).update)(fecha_cierre=self.now)
            await ws.send_json_to({'event': 'chat.message.send', 'data': data})
            retry = await next_chat_event(ws)
            self.assertEqual(retry['event'], 'chat.message.ack')
            self.assertFalse(retry['data']['created'])
            self.assertEqual(retry['data']['id'], ack['data']['id'])
            await ws.send_json_to({'event': 'chat.message.send', 'data': dict(data, contenido='otro')})
            self.assertEqual((await next_chat_event(ws))['data']['status'], 409)
            await ws.disconnect()
        async_to_sync(run)()
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_retry_por_alias_conserva_origen_historico(self):
        from citas.models import Cita
        other = Cita.objects.create(id_medico=self.doctor, id_usuario=self.patient,
            id_estado=self.states['confirmada'], fecha_programada=self.now)
        canonical = self.conv
        self.conv = Conversacion.objects.create(cita=other, canonica=canonical)
        uid = uuid4()
        Mensaje.objects.create(conversacion=canonical, origen=canonical, tipo='paciente',
            emisor_usuario=self.patient, client_message_id=uid, contenido='Primero')
        expected = Mensaje.objects.create(conversacion=canonical, origen=self.conv, cita=other,
            tipo='paciente', emisor_usuario=self.patient, client_message_id=uid, contenido='Segundo')
        async def run():
            ws = self.socket()
            self.assertTrue((await ws.connect())[0])
            try:
                await ws.send_json_to({'event': 'chat.message.send', 'data': {
                    'client_message_id': str(uid), 'contenido': 'Segundo'}})
                ack = await next_chat_event(ws)
                self.assertEqual(ack['event'], 'chat.message.ack')
                self.assertEqual(ack['data']['id'], expected.pk)
                self.assertFalse(ack['data']['created'])
            finally:
                await ws.disconnect()
        async_to_sync(run)()
        self.assertEqual(Mensaje.objects.count(), 2)

    def test_deshabilitacion_manual_actualiza_socket_y_bloquea_envios(self):
        from datetime import timedelta
        from .services import habilitarConversacionAnticipadamenteService, deshabilitarConversacionService
        self.cita.fecha_programada = self.now + timedelta(days=3); self.cita.save()
        self.assertEqual(habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)[1], 200)
        async def run():
            ws = self.socket()
            self.assertTrue((await ws.connect())[0])
            try:
                result = await database_sync_to_async(deshabilitarConversacionService)(self.conv.pk, self.doctor)
                self.assertEqual(result[1], 200)
                events = [await next_chat_event(ws), await next_chat_event(ws)]
                updated = next(e for e in events if e['event'] == 'chat.conversation.updated')
                self.assertEqual(updated['data']['estado'], 'programado')
                await ws.send_json_to({'event': 'chat.message.send', 'data': {
                    'client_message_id': str(uuid4()), 'contenido': 'No debe guardarse'}})
                self.assertEqual((await next_chat_event(ws))['data']['status'], 403)
            finally:
                await ws.disconnect()
        async_to_sync(run)()
        self.assertFalse(Mensaje.objects.filter(contenido='No debe guardarse').exists())
