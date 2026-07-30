# notificaciones/services.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from notificaciones.models import Notificacion
from notificaciones.serializers import NotificacionSerializer

def enviarNotificacion(titulo, mensaje, tipo, id_usuario=None, id_medico=None):
    notificacion = Notificacion.objects.create(
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        id_usuario_id=id_usuario,
        id_medico_id=id_medico
    )
    
    destinatario_id = id_usuario or id_medico

    if destinatario_id:
        if id_usuario:
            count_unreads = Notificacion.objects.filter(id_usuario_id=id_usuario, leida=False).count()
        else:
            count_unreads = Notificacion.objects.filter(id_medico_id=id_medico, leida=False).count()

        serializer = NotificacionSerializer(notificacion)

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{destinatario_id}", 
            {
                "type": "send_notification_count",  
                "count": count_unreads,
                "notificacion": serializer.data
            }
        )

    return notificacion