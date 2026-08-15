import json 
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Notificacion

class NotificacionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f"user_{self.user_id}"
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()

        # Enviar el conteo inicial al conectar
        unreads = await self.get_unread_count(self.user_id)
        await self.send(text_data=json.dumps({
            "type": "count_initial",
            "count": unreads
        }))
        
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
    async def send_notification_count(self, event):
        payload = {
            "type": "notification_update",
            "count": event["count"]
        }
        
        if "notificacion" in event:
            payload["notificacion"] = event["notificacion"]

        #  Si el payload traía información de la cita o tipo de evento, los adjuntamos
        if "tipo_evento" in event:
            payload["tipo_evento"] = event["tipo_evento"]

        if "cita" in event:
            payload["cita"] = event["cita"]

        await self.send(text_data=json.dumps(payload))

    @database_sync_to_async
    def get_unread_count(self, user_id):
        # Cuenta si el ID corresponde a usuario o médico
        return Notificacion.objects.filter(
            id_usuario_id=user_id, leida=False
        ).count() or Notificacion.objects.filter(
            id_medico_id=user_id, leida=False
        ).count()