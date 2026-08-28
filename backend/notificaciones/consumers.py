import json
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from medicos.models import Medico
from users.models import Usuario

from .models import Notificacion

class NotificacionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        usuario = self.scope.get("user")

        if not usuario or not usuario.is_authenticated:
            await self.close(code=4401)
            return

        self.usuario = usuario

        if isinstance(usuario, Usuario):
            self.tipo_usuario = "paciente"
            self.user_id = usuario.id
            self.room_group_name = f"user_{usuario.id}"

        elif isinstance(usuario, Medico):
            self.tipo_usuario = "medico"
            self.user_id = usuario.id
            self.room_group_name = f"medico_{usuario.id}"

        else:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()

        unreads = await self.get_unread_count()

        await self.send(
            text_data=json.dumps({
                "type": "count_initial",
                "count": unreads,
            })
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name,
            )

    async def send_notification_count(self, event):
        payload = {
            "type": "notification_update",
            "count": event["count"],
        }

        if "notificacion" in event:
            payload["notificacion"] = event["notificacion"]

        if "tipo_evento" in event:
            payload["tipo_evento"] = event["tipo_evento"]

        if "cita" in event:
            payload["cita"] = event["cita"]

        await self.send(
            text_data=json.dumps(payload)
        )

    @database_sync_to_async
    def get_unread_count(self):
        if self.tipo_usuario == "paciente":
            return Notificacion.objects.filter(
                id_usuario_id=self.user_id,
                leida=False,
            ).count()

        if self.tipo_usuario == "medico":
            return Notificacion.objects.filter(
                id_medico_id=self.user_id,
                leida=False,
            ).count()

        return 0