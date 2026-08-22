# notificaciones/services.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from notificaciones.models import Notificacion
from medicos.models import Medico
from users.models import Usuario
from notificaciones.serializers import NotificacionSerializer
from citas.serializers import CitaSerializer

def enviarNotificacion(titulo, mensaje, tipo, id_usuario=None, id_medico=None, extra_data=None):
    # 1. Crear registro en BD
    notificacion = Notificacion.objects.create(
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        id_usuario_id=id_usuario,
        id_medico_id=id_medico
    )
    
    # 2. Definir destinatario y conteo de no leídas
    if id_usuario:
        group_name = f"user_{id_usuario}"
        count_unreads = Notificacion.objects.filter(id_usuario_id=id_usuario, leida=False).count()
    elif id_medico:
        group_name = f"medico_{id_medico}" # Ajustar según prefijo en tu Consumer
        count_unreads = Notificacion.objects.filter(id_medico_id=id_medico, leida=False).count()
    else:
        group_name = None

    # 3. Transmitir por WebSocket si hay destinatario
    if group_name:
        serializer = NotificacionSerializer(notificacion)

        event_payload = {
            "type": "send_notification_count", # Llama al método en el Consumer
            "count": count_unreads,
            "notificacion": serializer.data,
            **(extra_data or {}) # Adjunta tipo_evento, cita, etc.
        }

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            group_name, 
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

def listarNotificacionesService(usuario):

    if isinstance(usuario, Medico):

        notificaciones = Notificacion.objects.filter(
            id_medico=usuario
        ).order_by("-fecha")

    else:

        notificaciones = Notificacion.objects.filter(
            id_usuario=usuario
        ).order_by("-fecha")

    data = []

    for notificacion in notificaciones:
        data.append({
            "id": notificacion.id,
            "titulo": notificacion.titulo,
            "mensaje": notificacion.mensaje,
            "tipo": notificacion.tipo,
            "leida": notificacion.leida,
            "fecha": notificacion.fecha,
        })

    return data, 200

def marcarNotificacionLeidaService(id_notificacion, usuario):

    notificacion = Notificacion.objects.filter(
        id=id_notificacion
    ).first()

    if not notificacion:
        return "Notificación no encontrada", 404

    es_destinatario = False

    if notificacion.id_usuario:
        es_destinatario = (
            notificacion.id_usuario.id == usuario.id
        )

    if notificacion.id_medico:
        es_destinatario = (
            notificacion.id_medico.id == usuario.id
        )

    if not es_destinatario:
        return "No tienes permiso para modificar esta notificación", 403

    if not notificacion.leida:
        notificacion.leida = True
        notificacion.save(
            update_fields=["leida"]
        )

    return "Notificación marcada como leída", 200

def marcarTodasNotificacionesLeidasService(usuario):
    if isinstance(usuario,Usuario):
        notificaciones = Notificacion.objects.filter(id_usuario=usuario,leida=False)
    
    elif isinstance(usuario,Medico):
        notificaciones = Notificacion.objects.filter(id_medico=usuario,leida=False)
        
    else:
        return "Usuario no válido",400
    
    notificaciones.update(leida=True)
    
    return "Notificaciones marcadas como leidas",200