import asyncio
import json
import logging
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework.exceptions import ValidationError
from chatbot.middleware import _usuario_desde_token
from .access import cargarConversacionVisible, identidadActor
from .exceptions import ChatError
from .models import Mensaje
from .message_services import enviarMensajeConversacionService
from .serializers import EnviarMensajeSerializer, MensajeSerializer
from .serializers import LecturaSerializer
from .read_services import marcarLecturaConversacionService
from .services import puedeEscribirConversacionService
from django.core.cache import cache
from . import presence

logger = logging.getLogger(__name__)


class ChatCitasConsumer(AsyncJsonWebsocketConsumer):
    async def _autorizar(self):
        token = self.scope.get('bymax_token')
        try:
            if not token:
                raise ValueError()
            actor = await _usuario_desde_token(token)
        except Exception:
            raise ChatError(401, 'unauthenticated', 'Autenticación no vigente')
        self.actor = await self._visible(actor)
        return self.actor

    @database_sync_to_async
    def _visible(self, actor):
        return cargarConversacionVisible(self.conversacion_id, actor)[1]

    async def connect(self):
        self.conversacion_id = int(self.scope['url_route']['kwargs']['conversacion_id'])
        self.group = f'chat_citas_{self.conversacion_id}'
        try:
            await self._autorizar()
        except ChatError as exc:
            await self.close(code=4401 if exc.status == 401 else 4404 if exc.status == 404 else 4403)
            return
        await self.channel_layer.group_add(self.group, self.channel_name)
        self.presence_identity, self.counterpart = await database_sync_to_async(presence.renovar)(
            self.channel_name, self.conversacion_id, self.actor)
        self.presence_group = presence.grupo(self.counterpart)
        self.last_presence = None
        await self.channel_layer.group_add(self.presence_group, self.channel_name)
        await self.accept()
        await self._snapshot_presence()
        await self._signal_presence()
        self.presence_task = asyncio.create_task(self._poll_presence())

    async def disconnect(self, code):
        task = getattr(self, 'presence_task', None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        if hasattr(self, 'presence_identity'):
            await database_sync_to_async(presence.retirar)(self.channel_name)
            await self.channel_layer.group_discard(self.presence_group, self.channel_name)
            await self._signal_presence()
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def _signal_presence(self):
        await self.channel_layer.group_send(presence.grupo(self.presence_identity), {'type': 'presence_changed'})

    async def _snapshot_presence(self):
        current = await database_sync_to_async(presence.online)(self.counterpart)
        if current != self.last_presence:
            self.last_presence = current
            await self.send_json({'event': 'chat.presence', 'data': {
                'actor': {'tipo': self.counterpart[0], 'id': self.counterpart[1]}, 'online': current}})

    async def presence_changed(self, event):
        try:
            await self._autorizar()
            await self._snapshot_presence()
        except ChatError:
            await database_sync_to_async(presence.retirar)(self.channel_name)
            await self._signal_presence()
            await self.close(code=4403)

    async def _poll_presence(self):
        try:
            while True:
                await asyncio.sleep(presence.POLL_SECONDS)
                await self._autorizar()
                if not await database_sync_to_async(presence.vigente)(self.channel_name):
                    await database_sync_to_async(presence.retirar)(self.channel_name)
                    await self._signal_presence()
                    await self.close(code=4408)
                    return
                await self._snapshot_presence()
                await self.send_json({'event': 'chat.presence.ping', 'data': {}})
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.warning('Presencia interrumpida; se cierra el socket', exc_info=True)
            try:
                await database_sync_to_async(presence.retirar)(self.channel_name)
                await self._signal_presence()
            finally:
                await self.close(code=4403)

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        if text_data is None or len(text_data) > 65536:
            await self._error(ChatError(400, 'invalid_payload', 'Payload inválido'))
            return
        try:
            payload = json.loads(text_data)
        except (ValueError, TypeError, RecursionError):
            await self._error(ChatError(400, 'invalid_json', 'JSON inválido'))
            return
        await self.receive_json(payload)

    async def receive_json(self, content, **kwargs):
        try:
            await self._autorizar()
            if not isinstance(content, dict) or set(content) != {'event', 'data'}:
                raise ChatError(400, 'invalid_payload', 'Se requieren event y data')
            if content['event'] == 'chat.presence.heartbeat':
                if content['data'] != {}:
                    raise ChatError(400, 'invalid_payload', 'Heartbeat inválido')
                if not await database_sync_to_async(presence.vigente)(self.channel_name):
                    await self.close(code=4408)
                    return
                await database_sync_to_async(presence.renovar)(self.channel_name, self.conversacion_id, self.actor)
                await self._signal_presence()
                return
            if content['event'] == 'chat.typing':
                data = await self._typing(content['data'])
                if data is not None:
                    await self.channel_layer.group_send(self.group, {'type': 'chat_event',
                        'event': 'chat.typing', 'data': data, 'excluir_actor': identidadActor(self.actor)})
                return
            if content['event'] == 'chat.message.read':
                await self._read(content['data'])
                return
            if content['event'] != 'chat.message.send':
                raise ChatError(400, 'unknown_event', 'Evento no permitido')
            result = await self._send_message(content['data'])
            # El service síncrono terminó su atomic: el ack nunca anticipa commit.
            await self.send_json({'event': 'chat.message.ack', 'data': result})
        except ChatError as exc:
            await self._error(exc)
        except ValidationError:
            await self._error(ChatError(400, 'invalid_payload', 'Datos de mensaje inválidos'))
        except Exception:
            logger.exception('Error procesando operación de chat')
            await self._error(ChatError(500, 'internal_error', 'No se pudo procesar la operación'))

    async def _error(self, exc):
        await self.send_json({'event': 'chat.error', 'data': {
            'code': exc.code, 'detail': exc.detail, 'status': exc.status}})
        if exc.status in (401, 403):
            # Una denegación de escritura no retira acceso de lectura.
            try:
                await self._autorizar()
            except ChatError:
                await self.close(code=4401 if exc.status == 401 else 4403)

    @database_sync_to_async
    def _read(self, data):
        serializer = LecturaSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        marcarLecturaConversacionService(self.conversacion_id, self.actor, **serializer.validated_data)

    @database_sync_to_async
    def _typing(self, data):
        conv, actor = cargarConversacionVisible(self.conversacion_id, self.actor)
        if not puedeEscribirConversacionService(conv, actor):
            raise ChatError(403, 'forbidden', 'La conversación no permite escribir')
        if not isinstance(data, dict) or set(data) != {'escribiendo'} or type(data['escribiendo']) is not bool:
            raise ChatError(400, 'invalid_typing', 'Se requiere escribiendo booleano')
        kind, pk = identidadActor(actor)
        if data['escribiendo']:
            try:
                if not cache.add(f'chat_typing:{conv.pk}:{kind}:{pk}', True, timeout=1):
                    return None
            except Exception:
                logger.warning('Typing omitido por fallo de caché')
                return None
        return {'escribiendo': data['escribiendo'], 'actor': {'tipo': kind, 'id': pk}}

    @database_sync_to_async
    def _send_message(self, data):
        serializer = EnviarMensajeSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        result = enviarMensajeConversacionService(self.conversacion_id, self.actor, **serializer.validated_data)
        return {'id': result.mensaje.pk, 'client_message_id': str(result.mensaje.client_message_id),
                'created': result.created}

    @database_sync_to_async
    def _message_data(self, pk):
        cargarConversacionVisible(self.conversacion_id, self.actor)
        message = Mensaje.objects.prefetch_related('adjuntos__archivo').get(pk=pk, conversacion_id=self.conversacion_id)
        return dict(MensajeSerializer(message).data)

    async def chat_event(self, event):
        try:
            await self._autorizar()
            if event.get('excluir_actor') and tuple(event['excluir_actor']) == identidadActor(self.actor):
                return
            data = event['data']
            if event['event'] == 'chat.message.created':
                data = await self._message_data(data['id'])
            await self.send_json({'event': event['event'], 'data': data})
        except ChatError as exc:
            await self.close(code=4401 if exc.status == 401 else 4403)
