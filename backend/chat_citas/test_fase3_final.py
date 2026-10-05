"""Cierre 3C: transporte real y ordenamientos conceptuales, sin locks MySQL."""
from datetime import timedelta
from uuid import uuid4
from unittest.mock import patch

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.db import transaction
from django.test import TransactionTestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from catalogos.models import Estado, Rol
from citas.models import Cita
from citas.services import cancelarCitaService, editarCitaService
from medicos.models import Medico, SolicitudValidacionMedico
from notificaciones.models import Notificacion
from storage_app.models import Archivo
from . import test_fase3_websocket as fixtures
from .models import AdjuntoConversacion, Conversacion, Mensaje
from .message_services import enviarMensajeConversacionService
from .read_services import marcarLecturaConversacionService
from .services import habilitarConversacionAnticipadamenteService, obtenerEstadoConversacionService
from .exceptions import ChatError
from .test_support import Fase3Fixture


class FinalTransportTests(TransactionTestCase):
    setUp = fixtures.WebsocketTests.setUp

    def token(self, actor):
        token = AccessToken()
        token['user_id'] = actor.pk
        token['tipo'] = 'medico' if isinstance(actor, Medico) else 'usuario'
        return str(token)

    def socket(self, actor=None, *, token=None, query='', pk=None):
        from core.asgi import application
        headers = [(b'origin', settings.WEBSOCKET_ALLOWED_ORIGINS[0].encode())]
        if actor is not None or token is not None:
            headers.append((b'cookie', ('token=' + (token if token is not None else self.token(actor))).encode()))
        return WebsocketCommunicator(application, f'/ws/chat-citas/{pk or self.conv.pk}/' + query, headers=headers)

    def client_for(self, actor):
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token(actor))
        return client

    def test_auth_cookie_matriz_y_query_no_autentica(self):
        admin = Rol.objects.create(nombre='admin')
        type(self.patients[1]).objects.filter(pk=self.patients[1].pk).update(id_rol=admin)
        async def run():
            cases = [(self.socket(), 4401), (self.socket(token='invalid'), 4401),
                     (self.socket(query='?token=' + self.token(self.patient)), 4401),
                     (self.socket(self.patients[1]), 4403), (self.socket(self.doctors[0]), 4403),
                     (self.socket(self.patient, pk=999999), 4404)]
            expired = AccessToken(self.token(self.patient))
            expired['exp'] = 1
            cases.append((self.socket(token=str(expired)), 4401))
            await database_sync_to_async(SolicitudValidacionMedico.objects.filter(medico=self.doctor).update)(estado='rechazado')
            cases.append((self.socket(self.doctor), 4403))
            for ws, code in cases:
                try:
                    self.assertEqual(await ws.connect(), (False, code))
                finally:
                    await ws.disconnect()
        async_to_sync(run)()

    def test_json_anidado_excesivo_devuelve_400_y_conexion_sigue_util(self):
        async def run():
            ws = self.socket(self.patient)
            await ws.connect()
            await ws.send_to(text_data='[' * 30000 + '0' + ']' * 30000)
            self.assertEqual((await ws.receive_json_from())['data']['status'], 400)
            await ws.send_json_to({'event': 'chat.message.send', 'data': {
                'client_message_id': str(uuid4()), 'contenido': 'válido'}})
            events = [await ws.receive_json_from(), await ws.receive_json_from()]
            self.assertEqual({e['event'] for e in events}, {'chat.message.ack', 'chat.message.created'})
            await ws.disconnect()
        async_to_sync(run)()

    def test_matriz_estados_rest_ws_retry_y_creacion(self):
        path = f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/'
        for name, hours, final_hours, writable in (
            ('confirmada', 72, None, False), ('confirmada', 1, None, True),
            ('cancelada', 1, None, False), ('inasistencia_paciente', 1, None, False),
            ('completada', 1, 23, True), ('completada', 1, 24, False),
            ('reprogramada', 72, None, False), ('reprogramada', 1, None, True)):
            with self.subTest(state=name, hours=hours, final_hours=final_hours):
                # Operación confirmada antes del cambio clínico; respuesta perdida.
                Cita.objects.filter(pk=self.cita.pk).update(id_estado=self.states['confirmada'],
                    fecha_programada=self.now + timedelta(hours=1), fecha_final=None)
                payload = {'client_message_id': str(uuid4()), 'contenido': 'persistido'}
                original = self.client_for(self.patient).post(path, payload, format='json')
                self.assertEqual(original.status_code, 201)
                state, _ = Estado.objects.get_or_create(nombre=name)
                Cita.objects.filter(pk=self.cita.pk).update(id_estado=state,
                    fecha_programada=self.now + timedelta(hours=hours),
                    fecha_final=self.now - timedelta(hours=final_hours) if final_hours is not None else None)
                counts = Mensaje.objects.count(), Notificacion.objects.count()
                async def run():
                    for actor in (self.patient, self.doctor):
                        ws = self.socket(actor)
                        self.assertTrue((await ws.connect())[0])
                        await ws.disconnect()
                    ws = self.socket(self.patient)
                    await ws.connect()
                    await ws.send_json_to({'event': 'chat.message.send', 'data': payload})
                    ack = await ws.receive_json_from()
                    self.assertEqual(ack['data']['id'], original.data['data']['id'])
                    self.assertFalse(ack['data']['created'])
                    self.assertTrue(await ws.receive_nothing(timeout=0.05))
                    await ws.send_json_to({'event': 'chat.message.send', 'data': dict(payload, contenido='diferente')})
                    self.assertEqual((await ws.receive_json_from())['data']['status'], 409)
                    await ws.send_json_to({'event': 'chat.message.send', 'data': {
                        'client_message_id': str(uuid4()), 'contenido': 'nuevo'}})
                    if writable:
                        events = [await ws.receive_json_from(), await ws.receive_json_from()]
                        self.assertEqual({e['event'] for e in events}, {'chat.message.ack', 'chat.message.created'})
                    else:
                        self.assertEqual((await ws.receive_json_from())['data']['status'], 403)
                    await ws.disconnect()
                async_to_sync(run)()
                self.assertEqual(Mensaje.objects.count(), counts[0] + int(writable))
                if not writable:
                    self.assertEqual(Notificacion.objects.count(), counts[1])
                rest_new = self.client_for(self.patient).post(path,
                    {'client_message_id': str(uuid4()), 'contenido': 'rest'}, format='json')
                self.assertEqual(rest_new.status_code, 201 if writable else 403)

    def test_nota_adjuntos_ws_rest_mismo_dto_y_retry_tras_activacion(self):
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now + timedelta(days=3))
        archivo = Archivo.objects.create(usuario=self.patient, storage_key='private/not-exposed',
            nombre_original='nota.pdf', categoria='chat_citas_privado', content_type='application/pdf', tamano=8)
        adj = AdjuntoConversacion.objects.create(conversacion=self.conv, archivo=archivo)
        payload = {'client_message_id': str(uuid4()), 'contenido': '', 'modalidad': 'nota_previa', 'adjunto_ids': [adj.pk]}
        async def run():
            ws = self.socket(self.patient)
            await ws.connect()
            await ws.send_json_to({'event': 'chat.message.send', 'data': payload})
            events = [await ws.receive_json_from(), await ws.receive_json_from()]
            dto = next(e['data'] for e in events if e['event'] == 'chat.message.created')
            self.assertEqual(dto['tipo'], 'nota_previa')
            self.assertEqual(dto['emisor'], {'tipo': 'paciente', 'id': self.patient.pk})
            self.assertEqual(dto['adjuntos'][0]['id'], adj.pk)
            self.assertNotIn('storage_key', str(dto))
            self.assertNotIn('private/not-exposed', str(dto))
            await ws.disconnect()
            return dto
        dto = async_to_sync(run)()
        Cita.objects.filter(pk=self.cita.pk).update(fecha_programada=self.now + timedelta(hours=1))
        counts = Mensaje.objects.count(), Notificacion.objects.count()
        response = self.client_for(self.patient).post(f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['id'], dto['id'])
        self.assertEqual(response.data['data']['adjuntos'], dto['adjuntos'])
        self.assertEqual(counts, (Mensaje.objects.count(), Notificacion.objects.count()))

    def test_revocacion_antes_de_operaciones_no_conserva_acceso(self):
        msg = enviarMensajeConversacionService(self.conv.pk, self.patient, client_message_id=uuid4(), contenido='hola').mensaje
        for event, data in (('chat.message.send', {'client_message_id': str(uuid4()), 'contenido': 'x'}),
                            ('chat.message.read', {'ultimo_mensaje_id': msg.pk}), ('chat.typing', {'escribiendo': True})):
            SolicitudValidacionMedico.objects.filter(medico=self.doctor).update(estado='aprobado')
            async def run():
                ws = self.socket(self.doctor)
                await ws.connect()
                await database_sync_to_async(SolicitudValidacionMedico.objects.filter(medico=self.doctor).update)(estado='rechazado')
                await ws.send_json_to({'event': event, 'data': data})
                self.assertEqual((await ws.receive_json_from())['data']['status'], 403)
                self.assertEqual((await ws.receive_output())['code'], 4403)
                await ws.disconnect()
            async_to_sync(run)()
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.ultimo_leido_medico_id)
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_lectura_monotona_idempotente_sin_eco(self):
        msgs = [enviarMensajeConversacionService(self.conv.pk, self.patient,
            client_message_id=uuid4(), contenido='hola').mensaje for _ in range(2)]
        async def run():
            reader, recipient = self.socket(self.doctor), self.socket(self.patient)
            await reader.connect()
            await recipient.connect()
            await reader.send_json_to({'event': 'chat.message.read', 'data': {'ultimo_mensaje_id': msgs[1].pk}})
            event = await recipient.receive_json_from()
            self.assertEqual(event['event'], 'chat.message.read')
            self.assertEqual(event['data']['actor'], {'tipo': 'medico', 'id': self.doctor.pk})
            for pk in (msgs[1].pk, msgs[0].pk):
                await reader.send_json_to({'event': 'chat.message.read', 'data': {'ultimo_mensaje_id': pk}})
                self.assertTrue(await recipient.receive_nothing(timeout=0.1))
            self.assertTrue(await reader.receive_nothing(timeout=0.1))
            await reader.disconnect()
            await recipient.disconnect()
        async_to_sync(run)()
        self.conv.refresh_from_db()
        self.assertEqual(self.conv.ultimo_leido_medico_id, msgs[1].pk)

    def test_rollback_lectura_no_emite_y_envio_no_ack_exitoso(self):
        msg = enviarMensajeConversacionService(self.conv.pk, self.patient, client_message_id=uuid4(), contenido='hola').mensaje
        with patch('chat_citas.realtime._emitir') as emit:
            with self.assertRaises(RuntimeError), transaction.atomic():
                marcarLecturaConversacionService(self.conv.pk, self.doctor, msg.pk)
                raise RuntimeError('rollback')
            emit.assert_not_called()
        self.conv.refresh_from_db()
        self.assertIsNone(self.conv.ultimo_leido_medico_id)
        async def run():
            ws = self.socket(self.patient)
            await ws.connect()
            with patch('chat_citas.realtime.programarEventoChat', side_effect=RuntimeError('rollback')):
                await ws.send_json_to({'event': 'chat.message.send', 'data': {'client_message_id': str(uuid4()), 'contenido': 'no confirmado'}})
                event = await ws.receive_json_from()
            self.assertEqual(event['event'], 'chat.error')
            self.assertEqual(event['data']['status'], 500)
            self.assertTrue(await ws.receive_nothing(timeout=0.1))
            await ws.disconnect()
        async_to_sync(run)()
        self.assertEqual(Mensaje.objects.count(), 1)

    def test_respuesta_ack_perdida_recuperable_por_rest(self):
        from .consumers import ChatCitasConsumer
        original_send = ChatCitasConsumer.send_json
        async def lose_ack(consumer, content, close=False):
            if content['event'] == 'chat.message.ack':
                raise ConnectionError('simulated transport failure')
            return await original_send(consumer, content, close=close)
        payload = {'client_message_id': str(uuid4()), 'contenido': 'confirmado'}
        async def run():
            ws = self.socket(self.patient)
            await ws.connect()
            with patch.object(ChatCitasConsumer, 'send_json', lose_ack):
                await ws.send_json_to({'event': 'chat.message.send', 'data': payload})
                events = [await ws.receive_json_from(), await ws.receive_json_from()]
                self.assertEqual({e['event'] for e in events}, {'chat.error', 'chat.message.created'})
            await ws.disconnect()
        async_to_sync(run)()
        first = Mensaje.objects.get(client_message_id=payload['client_message_id'])
        Conversacion.objects.filter(pk=self.conv.pk).update(fecha_cierre=self.now)
        counts = Mensaje.objects.count(), Notificacion.objects.count()
        retry = self.client_for(self.patient).post(f'/api/chat-citas/conversaciones/{self.conv.pk}/mensajes/', payload, format='json')
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.data['data']['id'], first.pk)
        self.assertEqual(counts, (Mensaje.objects.count(), Notificacion.objects.count()))

    def test_typing_programado_invalidos_y_cache_no_rompe_envio(self):
        from django.core.cache import cache
        cache.clear()
        async def run():
            ws = self.socket(self.patient)
            await ws.connect()
            for value in (1, 'true', None):
                await ws.send_json_to({'event': 'chat.typing', 'data': {'escribiendo': value}})
                self.assertEqual((await ws.receive_json_from())['data']['status'], 400)
            await database_sync_to_async(Cita.objects.filter(pk=self.cita.pk).update)(fecha_programada=self.now + timedelta(days=3))
            await ws.send_json_to({'event': 'chat.typing', 'data': {'escribiendo': True}})
            self.assertEqual((await ws.receive_json_from())['data']['status'], 403)
            await database_sync_to_async(Cita.objects.filter(pk=self.cita.pk).update)(fecha_programada=self.now + timedelta(hours=1))
            with patch('chat_citas.consumers.cache.add', side_effect=RuntimeError('offline')):
                await ws.send_json_to({'event': 'chat.typing', 'data': {'escribiendo': True}})
                self.assertTrue(await ws.receive_nothing(timeout=0.1))
                await ws.send_json_to({'event': 'chat.message.send', 'data': {'client_message_id': str(uuid4()), 'contenido': 'hola'}})
                self.assertEqual({(await ws.receive_json_from())['event'], (await ws.receive_json_from())['event']},
                    {'chat.message.ack', 'chat.message.created'})
            await ws.disconnect()
        async_to_sync(run)()
        self.assertEqual(Mensaje.objects.count(), 1)
        self.assertEqual(Notificacion.objects.filter(conversacion=self.conv).count(), 1)


class ConceptualOrderingTests(Fase3Fixture):
    def test_cancelacion_gana_envio_rechazado(self):
        cancelarCitaService(self.cita.pk, self.patient)
        with self.assertRaises(ChatError):
            enviarMensajeConversacionService(self.conv.pk, self.patient, client_message_id=uuid4(), contenido='posterior')
        self.assertFalse(Mensaje.objects.exclude(tipo='sistema').exists())

    def test_habilitacion_reprogramacion_ambos_ordenes_coherentes(self):
        Estado.objects.get_or_create(nombre='reprogramada')
        self.cita.fecha_programada = self.now + timedelta(days=3)
        self.cita.save()
        habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)
        editarCitaService(self.cita.pk, {'fecha_programada': self.now + timedelta(days=4)}, self.patient)
        self.conv.refresh_from_db()
        self.assertEqual(obtenerEstadoConversacionService(self.conv)['estado'], 'programado')
        self.assertIsNone(self.conv.fecha_habilitacion_anticipada)
        habilitarConversacionAnticipadamenteService(self.conv.pk, self.doctor)
        self.conv.refresh_from_db()
        self.assertEqual(obtenerEstadoConversacionService(self.conv)['estado'], 'activo')
        self.assertEqual(Mensaje.objects.filter(metadata__evento='chat_habilitado').count(), 2)
