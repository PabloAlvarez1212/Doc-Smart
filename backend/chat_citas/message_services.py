from dataclasses import dataclass
from uuid import UUID
from django.db import transaction
from .access import bloquearConversacion, identidadActor
from .exceptions import ChatError
from .models import Mensaje
from .services import puedeEscribirConversacionService, obtenerEstadoConversacionService
from .read_services import mensajesNoLeidos
from notificaciones.services import enviarNotificacion


@dataclass(frozen=True)
class SendResult:
    mensaje: Mensaje
    created: bool


def normalizarPayload(contenido, modalidad, adjunto_ids):
    if not isinstance(contenido, str) or modalidad not in ('mensaje', 'nota_previa'):
        raise ChatError(400, 'invalid_message', 'Contenido o modalidad inválidos')
    if not isinstance(adjunto_ids, (list, tuple)) or any(type(i) is not int or i <= 0 for i in adjunto_ids):
        raise ChatError(400, 'invalid_attachments', 'Adjuntos inválidos')
    if len(adjunto_ids) > 5 or len(set(adjunto_ids)) != len(adjunto_ids):
        raise ChatError(400, 'invalid_attachments', 'Máximo cinco adjuntos distintos')
    contenido = contenido.strip()
    if len(contenido) > 4000 or (not contenido and not adjunto_ids):
        raise ChatError(400, 'invalid_content', 'Se requiere texto de hasta 4000 caracteres o adjuntos')
    return contenido, modalidad, tuple(sorted(adjunto_ids))


def puedeCrearNota(conv, actor):
    return (identidadActor(actor)[0] == 'paciente'
            and conv.cita.id_estado.nombre.lower() in ('confirmada', 'reprogramada')
            and obtenerEstadoConversacionService(conv)['estado'] == 'programado')


@transaction.atomic
def enviarMensajeConversacionService(conversacion_id, actor, *, client_message_id,
                                     contenido='', modalidad='mensaje', adjunto_ids=()):
    conv, actor = bloquearConversacion(conversacion_id, actor)
    contenido, modalidad, adjunto_ids = normalizarPayload(contenido, modalidad, adjunto_ids)
    try:
        uid = UUID(str(client_message_id))
    except (ValueError, TypeError, AttributeError):
        raise ChatError(400, 'invalid_uuid', 'client_message_id debe ser UUID')
    kind, pk = identidadActor(actor)
    sender = {'emisor_medico_id' if kind == 'medico' else 'emisor_usuario_id': pk}
    existing = Mensaje.objects.filter(conversacion=conv, client_message_id=uid, **sender).first()
    if existing:
        previous_mode = 'nota_previa' if existing.tipo == 'nota_previa' else 'mensaje'
        previous_ids = tuple(existing.adjuntos.order_by('pk').values_list('pk', flat=True))
        if (existing.contenido, previous_mode, previous_ids) != (contenido, modalidad, adjunto_ids):
            raise ChatError(409, 'idempotency_conflict', 'El UUID corresponde a otro contenido')
        return SendResult(existing, False)
    if modalidad == 'nota_previa':
        if not puedeCrearNota(conv, actor):
            raise ChatError(403, 'forbidden', 'La nota previa no está disponible')
        if conv.mensajes.filter(tipo='nota_previa').exists():
            raise ChatError(409, 'note_exists', 'Ya existe una nota previa')
    elif not puedeEscribirConversacionService(conv, actor):
        raise ChatError(403, 'forbidden', 'La conversación no permite nuevos mensajes')
    from .attachment_services import bloquearAdjuntosParaEnvio
    attachments = bloquearAdjuntosParaEnvio(conv, actor, adjunto_ids)
    recipient = conv.cita.id_medico if kind == 'paciente' else conv.cita.id_usuario
    pending_human = mensajesNoLeidos(conv, recipient).exclude(tipo='sistema').exists()
    message = Mensaje.objects.create(conversacion=conv, tipo='nota_previa' if modalidad == 'nota_previa' else kind,
        contenido=contenido, client_message_id=uid, cupo_nota=1 if modalidad == 'nota_previa' else None, **sender)
    for adj in attachments:
        adj.mensaje = message
        adj.save(update_fields=['mensaje'])
    if modalidad == 'nota_previa' or not pending_human:
        enviarNotificacion('Nuevo mensaje de chat', 'Tienes información nueva en una conversación.',
            'mensaje_nuevo', conversacion_id=conv.pk,
            **({'id_medico': recipient.pk} if kind == 'paciente' else {'id_usuario': recipient.pk}))
    from .realtime import programarEventoChat
    programarEventoChat(conv.pk, 'chat.message.created', {'id': message.pk})
    return SendResult(message, True)
