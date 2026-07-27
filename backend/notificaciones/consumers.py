# notificaciones/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from notificaciones.models import Notificacion
from notificaciones.serializers import NotificacionSerializer

class NotificacionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'notificaciones_{self.user_id}'

        # Unirse al grupo
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # Enviar notificaciones no leídas al conectar
        notificaciones = await self.get_notificaciones_no_leidas()
        await self.send(text_data=json.dumps({
            'type': 'notificaciones_iniciales',
            'notificaciones': notificaciones
        }))

    async def disconnect(self, close_code):
        # Salir del grupo al desconectarse
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)

        # Marcar notificación como leída
        if data.get('type') == 'marcar_leida':
            await self.marcar_leida(data['id'])

    # Recibe notificación del grupo y la envía al cliente
    async def nueva_notificacion(self, event):
        await self.send(text_data=json.dumps({
            'type': 'nueva_notificacion',
            'notificacion': event['notificacion']
        }))

    @database_sync_to_async
    def get_notificaciones_no_leidas(self):
        notificaciones = Notificacion.objects.filter(
            id_usuario_id=self.user_id,
            leida=False
        )
        return NotificacionSerializer(notificaciones, many=True).data

    @database_sync_to_async
    def marcar_leida(self, notificacion_id):
        Notificacion.objects.filter(id=notificacion_id).update(leida=True)