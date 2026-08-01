# notificaciones/services.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from notificaciones.models import Notificacion
from notificaciones.serializers import NotificacionSerializer
from citas.serializers import CitaSerializer

def enviarNotificacion(titulo, mensaje, tipo, id_usuario=None, id_medico=None, extra_data=None):
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

        # Base del mensaje
        event_payload = {
            "type": "send_notification_count", #  Coincide con async def send_notification_count
            "count": count_unreads,
            "notificacion": serializer.data
        }

        # Adjuntamos extra_data si existe (como datos de la cita)
        if extra_data:
            event_payload.update(extra_data)

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{destinatario_id}", 
            event_payload
        )

    return notificacion

def notificar_actualizacion_cita(cita, fue_creada=False):
    paciente_id = cita.paciente.id
    
    tipo_evento = "NUEVA_SOLICITUD" if fue_creada else "ACTUALIZACION_CITA"
    titulo = "Nueva Solicitud de Cita" if fue_creada else "Actualización de Cita"
    mensaje = (
        f"Tu solicitud para {cita.especialidad} ha sido registrada."
        if fue_creada
        else f"Tu cita con el Dr. {cita.medico} cambió a estado: {cita.estado}."
    )

    data_cita = CitaSerializer(cita).data

    return enviarNotificacion(
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo_evento,
        id_usuario=paciente_id,
        extra_data={
            "tipo_evento": tipo_evento,
            "cita": data_cita
        }
    )