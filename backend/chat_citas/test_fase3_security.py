from datetime import timedelta
from uuid import uuid4
from unittest.mock import patch
from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from django.test import TransactionTestCase
from django.core.cache import cache
from medicos.models import SolicitudValidacionMedico
from . import test_fase3_websocket as wsfixtures
from .models import Mensaje, Conversacion
from .test_support import Fase3Fixture
from .message_services import enviarMensajeConversacionService
from .exceptions import ChatError
from .read_services import marcarLecturaConversacionService


class DomainSecurityTests(Fase3Fixture):
    def test_uuid_colision_entre_tipos_no_comparte_emisor(self):
        # El paciente propietario y otro médico tienen PK 101; no equivalen.
        uid = uuid4()
        first = enviarMensajeConversacionService(self.conv.pk, self.patient, client_message_id=uid, contenido='hola')
        with self.assertRaises(ChatError):
            enviarMensajeConversacionService(self.conv.pk, self.doctors[0], client_message_id=uid, contenido='hola')
        second = enviarMensajeConversacionService(self.conv.pk, self.doctor, client_message_id=uid, contenido='hola')
        self.assertNotEqual(first.mensaje.pk, second.mensaje.pk)

    def test_invalidos_no_escriben(self):
        for data in ({'contenido': 'x' * 4001}, {'contenido': '   '}, {'modalidad': 'sistema'},
                     {'client_message_id': 'bad'}, {'adjunto_ids': [1, 1]}, {'adjunto_ids': [True]},
                     {'adjunto_ids': [1, 2, 3, 4, 5, 6]}):
            with self.subTest(data=list(data)), self.assertRaises(ChatError):
                enviarMensajeConversacionService(self.conv.pk, self.patient,
                    **dict({'client_message_id': uuid4(), 'contenido': 'hola'}, **data))
        self.assertFalse(Mensaje.objects.exists())

    def test_completada_limite_24h_retry_permitido_nuevo_no(self):
        uid = uuid4()
        enviarMensajeConversacionService(self.conv.pk, self.patient, client_message_id=uid, contenido='hola')
        self.cita.id_estado = self.states['completada']
        self.cita.fecha_final = self.now - timedelta(hours=24)
        self.cita.save()
        self.assertFalse(enviarMensajeConversacionService(self.conv.pk, self.patient,
            client_message_id=uid, contenido='hola').created)
        with self.assertRaises(ChatError):
            enviarMensajeConversacionService(self.conv.pk, self.patient, client_message_id=uuid4(), contenido='nuevo')


class WebsocketSecurityTests(TransactionTestCase):
    setUp = wsfixtures.WebsocketTests.setUp
    socket = wsfixtures.WebsocketTests.socket

    def test_revocacion_antes_de_entrega_cierra_sin_filtrar(self):
        async def run():
            ws = self.socket(self.doctor)
            self.assertTrue((await ws.connect())[0])
            await database_sync_to_async(SolicitudValidacionMedico.objects.filter(medico=self.doctor).update)(estado='rechazado')
            await get_channel_layer().group_send(f'chat_citas_{self.conv.pk}', {
                'type': 'chat_event', 'event': 'chat.typing', 'data': {'escribiendo': True}})
            response = await ws.receive_output()
            self.assertEqual(response['type'], 'websocket.close')
            self.assertEqual(response['code'], 4403)
            await ws.disconnect()
        async_to_sync(run)()

    def test_json_malformado_y_forgery_no_persisten(self):
        async def run():
            ws = self.socket()
            self.assertTrue((await ws.connect())[0])
            await ws.send_to(text_data='{')
            self.assertEqual((await ws.receive_json_from())['data']['status'], 400)
            await ws.send_json_to({'event': 'chat.message.send', 'data': {
                'client_message_id': str(uuid4()), 'contenido': 'hola', 'tipo': 'sistema'}})
            self.assertEqual((await ws.receive_json_from())['data']['status'], 400)
            await ws.disconnect()
        async_to_sync(run)()
        self.assertFalse(Mensaje.objects.exists())

    def test_typing_throttle_stop_y_cache_fallida(self):
        cache.clear()
        async def run():
            patient, doctor = self.socket(), self.socket(self.doctor)
            await patient.connect()
            await doctor.connect()
            payload = {'event': 'chat.typing', 'data': {'escribiendo': True}}
            await patient.send_json_to(payload)
            self.assertTrue((await doctor.receive_json_from())['data']['escribiendo'])
            await patient.send_json_to(payload)
            self.assertTrue(await doctor.receive_nothing(timeout=0.1))
            await patient.send_json_to({'event': 'chat.typing', 'data': {'escribiendo': False}})
            self.assertFalse((await doctor.receive_json_from())['data']['escribiendo'])
            with patch('chat_citas.consumers.cache.add', side_effect=RuntimeError('offline')):
                await patient.send_json_to(payload)
                self.assertTrue(await doctor.receive_nothing(timeout=0.1))
            await patient.disconnect()
            await doctor.disconnect()
        async_to_sync(run)()
        self.assertFalse(Mensaje.objects.exists())

    def test_retry_rest_desde_ws_mismo_uuid(self):
        from .message_services import enviarMensajeConversacionService
        uid = uuid4()
        persisted = enviarMensajeConversacionService(self.conv.pk, self.patient, client_message_id=uid, contenido='hola')
        async def run():
            ws = self.socket()
            await ws.connect()
            await ws.send_json_to({'event': 'chat.message.send', 'data': {'client_message_id': str(uid), 'contenido': 'hola'}})
            ack = await ws.receive_json_from()
            self.assertFalse(ack['data']['created'])
            self.assertEqual(ack['data']['id'], persisted.mensaje.pk)
            self.assertTrue(await ws.receive_nothing(timeout=0.1))
            await ws.disconnect()
        async_to_sync(run)()
