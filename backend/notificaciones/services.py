# notificaciones/services.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from notificaciones.models import Notificacion
from medicos.models import Medico
from users.models import Usuario
from notificaciones.serializers import NotificacionSerializer
from citas.serializers import CitaSerializer
from django.core.paginator import Paginator
from django.db import transaction
from .serializers import NotificacionSerializer

def enviarNotificacion(titulo, mensaje, tipo, id_usuario=None, id_medico=None, extra_data=None, *, conversacion_id=None, cita_id=None, historial_id=None):
    # 1. Crear registro en BD
    notificacion = Notificacion.objects.create(
        titulo=titulo,
        mensaje=mensaje,
        tipo=tipo,
        id_usuario_id=id_usuario,
        id_medico_id=id_medico,
        conversacion_id=conversacion_id,
        cita_id=cita_id,
        historial_id=historial_id,
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
        transaction.on_commit(
            lambda: async_to_sync(channel_layer.group_send)(group_name, event_payload),
            robust=True,
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
        cita_id=cita.pk,
        extra_data={
            "tipo_evento": tipo_evento,
            "cita": data_cita
        }
    )

def listarNotificacionesService(usuario,page=None, page_size=10):

    if isinstance(usuario, Medico):

        notificaciones = Notificacion.objects.filter(
            id_medico=usuario
        ).order_by("-fecha")

    else:

        notificaciones = Notificacion.objects.filter(
            id_usuario=usuario
        ).order_by("-fecha")
                 
    try:
        page_size = int(page_size)
    except (TypeError, ValueError):
        page_size = 10

    paginator = Paginator(
        notificaciones,
        page_size
    )

    page_obj = paginator.get_page(
        page or 1
    )

    serializer = NotificacionSerializer(
        page_obj.object_list,
        many=True
    )
    
    return {
        "data":serializer.data,
        "no_leidas": notificaciones.filter(leida=False).count(),
        "paginacion": {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "page_size": page_size,
        },
        }, 200

def marcarNotificacionLeidaService(id_notificacion, usuario):

    notificacion = Notificacion.objects.filter(
        id=id_notificacion
    ).first()

    if not notificacion:
        return "Notificación no encontrada", 404

    es_destinatario = (
        isinstance(usuario, Usuario)
        and notificacion.id_usuario_id == usuario.id
    ) or (
        isinstance(usuario, Medico)
        and notificacion.id_medico_id == usuario.id
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

def eliminarNotificacionService(usuario,idNotificacion):

    if isinstance(usuario,Usuario):
        notificacion = Notificacion.objects.filter(id=idNotificacion,id_usuario=usuario).first()
    elif isinstance(usuario,Medico):
        notificacion = Notificacion.objects.filter(id=idNotificacion,id_medico=usuario).first()
    else:
        return "Usuario no válido",400
    
    if not notificacion:
        return "Notificación no encontrada", 404
    
    notificacion.delete()
    
    return "Notificacion eliminada correctamente",200

def eliminarTodasNotificacionesService(usuario):

    if isinstance(usuario, Usuario):
        notificaciones = Notificacion.objects.filter(
            id_usuario=usuario
        )

    elif isinstance(usuario, Medico):
        notificaciones = Notificacion.objects.filter(
            id_medico=usuario
        )

    else:
        return "Usuario no válido", 400

    notificaciones.delete()

    return "Todas las notificaciones fueron eliminadas correctamente", 200

# Exact event types only: titles and messages never select a destination.
EVENTOS_CITA = frozenset({
    'cita_confirmada', 'cita_cancelada', 'cita_agendada', 'cita_pendiente',
    'nueva_solicitud', 'cita_reprogramada', 'cita_completada', 'cita_vencida',
    'documentacion_seguimiento', 'cierre_cita_24h', 'cierre_cita_48h',
    'NUEVA_SOLICITUD', 'ACTUALIZACION_CITA',
})


def resolverDestinoNotificacionService(id_notificacion, usuario):
    notification = Notificacion.objects.select_related(
        'cita', 'conversacion__cita__id_estado', 'historial__cita',
    ).filter(pk=id_notificacion).first()
    if notification is None:
        return 'Notificación no encontrada', 404
    medico = isinstance(usuario, Medico)
    paciente = isinstance(usuario, Usuario)
    if not ((medico and notification.id_medico_id == usuario.pk) or
            (paciente and notification.id_usuario_id == usuario.pk)):
        return 'No tienes permiso para consultar esta notificación', 403
    prefix = '/doctor' if medico else '/patient'
    if notification.tipo in EVENTOS_CITA:
        kind, resource = 'cita', notification.cita
    elif notification.tipo == 'mensaje_nuevo':
        kind, resource = 'conversacion', notification.conversacion
    elif notification.tipo == 'historial_creado':
        kind, resource = 'historial', notification.historial
    else:
        return 'Esta notificación no tiene un destino disponible', 404
    if resource is None:
        return 'El recurso de esta notificación ya no está disponible', 404
    owner = resource.cita if kind == 'conversacion' else resource
    patient_id = owner.usuario_id if kind == 'historial' else owner.id_usuario_id
    doctor_id = owner.medico_id if kind == 'historial' else owner.id_medico_id
    if (medico and doctor_id != usuario.pk) or (paciente and patient_id != usuario.pk):
        return 'Ya no tienes permiso para consultar este recurso', 403
    if kind == 'conversacion':
        from chat_citas.services import puedeVerConversacionService
        if not puedeVerConversacionService(resource, usuario):
            return 'Esta conversación ya no está disponible para tu cuenta', 403
    if kind == 'cita':
        route = f'{prefix}/my-appointments?cita={resource.pk}'
    elif kind == 'conversacion':
        route = f'{prefix}/my-chats/{resource.pk}'
    elif medico:
        if resource.cita_id is None:
            return 'La cita de este historial ya no está disponible', 404
        if resource.cita.id_medico_id != usuario.pk:
            return 'Ya no tienes permiso para consultar la cita de este historial', 403
        route = f'{prefix}/my-appointments?historial={resource.pk}&cita={resource.cita_id}'
    else:
        route = f'{prefix}/my-medical-history?historial={resource.pk}'
    return {'tipo': kind, 'id': resource.pk, 'ruta': route,
            **({'cita_id': resource.cita_id} if kind == 'historial' else {})}, 200
