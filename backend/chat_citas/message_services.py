from dataclasses import dataclass
from uuid import UUID
from django.db import transaction
from .access import bloquearConversacion, identidadActor
from .exceptions import ChatError
from .models import Mensaje
from .services import puedeEscribirConversacionService, obtenerEstadoConversacionService, citasConversacion, citaContextual, _estado_individual
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
    return identidadActor(actor)[0] == 'paciente' and bool(citasParaNota(conv))


def citasParaNota(conv):
    from django.utils import timezone
    existentes = {m.cita_id for m in conv._notas_chat} if hasattr(conv, '_notas_chat') else set(conv.mensajes.filter(tipo='nota_previa').values_list('cita_id', flat=True))
    return [c for c in citasConversacion(conv) if _estado_individual(conv, c, timezone.now())['estado'] == 'programado'
            and c.pk not in existentes]


@transaction.atomic
def enviarMensajeConversacionService(conversacion_id, actor, *, client_message_id,
                                     contenido='', modalidad='mensaje', adjunto_ids=(), cita_id=None):
    conv, actor = bloquearConversacion(conversacion_id, actor)
    contenido, modalidad, adjunto_ids = normalizarPayload(contenido, modalidad, adjunto_ids)
    try:
        uid = UUID(str(client_message_id))
    except (ValueError, TypeError, AttributeError):
        raise ChatError(400, 'invalid_uuid', 'client_message_id debe ser UUID')
    kind, pk = identidadActor(actor)
    sender = {'emisor_medico_id' if kind == 'medico' else 'emisor_usuario_id': pk}
    candidates = Mensaje.objects.filter(conversacion=conv, client_message_id=uid, **sender).order_by('pk')
    existing = candidates.filter(origen_id=conversacion_id).first()
    if existing is None:
        historical = list(candidates[:2])
        if len(historical) > 1:
            raise ChatError(409, 'idempotency_conflict', 'UUID histórico ambiguo; utiliza la conversación original')
        existing = historical[0] if historical else None
    if existing:
        previous_mode = 'nota_previa' if existing.tipo == 'nota_previa' else 'mensaje'
        previous_ids = tuple(existing.adjuntos.order_by('pk').values_list('pk', flat=True))
        if (existing.contenido, previous_mode, previous_ids) != (contenido, modalidad, adjunto_ids) or (cita_id is not None and cita_id != existing.cita_id):
            raise ChatError(409, 'idempotency_conflict', 'El UUID corresponde a otro contenido')
        from .participant_services import estadoParticipante
        if existing.pk <= estadoParticipante(conv, actor).visible_despues_id:
            raise ChatError(410, 'history_hidden', 'Este mensaje pertenece al historial eliminado de tu cuenta')
        return SendResult(existing, False)
    citas = citasConversacion(conv)
    if cita_id is not None and not any(c.pk == cita_id for c in citas):
        raise ChatError(403, 'forbidden', 'La cita no pertenece a esta conversación')
    if modalidad == 'nota_previa':
        if kind != 'paciente':
            raise ChatError(403, 'forbidden', 'La nota previa no está disponible')
        elegibles = citasParaNota(conv)
        if not elegibles and conv.mensajes.filter(tipo='nota_previa', cita_id=cita_id or citaContextual(conv).pk).exists():
            raise ChatError(409, 'note_exists', 'Ya existe una nota previa')
        if cita_id is None and len(elegibles) != 1:
            raise ChatError(400, 'appointment_required', 'Selecciona la cita de la nota previa')
        cita = next((c for c in citas if c.pk == cita_id), None) if cita_id else elegibles[0]
        if cita not in elegibles:
            raise ChatError(409, 'note_exists', 'La nota de esta cita no está disponible o ya existe')
        if conv.mensajes.filter(tipo='nota_previa', cita=cita).exists():
            raise ChatError(409, 'note_exists', 'Ya existe una nota previa')
    elif not puedeEscribirConversacionService(conv, actor):
        raise ChatError(403, 'forbidden', 'La conversación no permite nuevos mensajes')
    else:
        cita = next((c for c in citas if c.pk == cita_id), None) if cita_id else citaContextual(conv)
    from .attachment_services import bloquearAdjuntosParaEnvio
    attachments = bloquearAdjuntosParaEnvio(conv, actor, adjunto_ids)
    recipient = conv.cita.id_medico if kind == 'paciente' else conv.cita.id_usuario
    pending_human = mensajesNoLeidos(conv, recipient).exclude(tipo='sistema').exists()
    message = Mensaje.objects.create(conversacion=conv, origen=conv, cita=cita, tipo='nota_previa' if modalidad == 'nota_previa' else kind,
        contenido=contenido, client_message_id=uid, cupo_nota=1 if modalidad == 'nota_previa' else None, **sender)
    for adj in attachments:
        adj.mensaje = message
        adj.save(update_fields=['mensaje'])
    if modalidad == 'nota_previa' or not pending_human:
        enviarNotificacion('Nuevo mensaje de chat', 'Tienes información nueva en una conversación.',
            'mensaje_nuevo', conversacion_id=conv.pk,
            **({'id_medico': recipient.pk} if kind == 'paciente' else {'id_usuario': recipient.pk}))
    from .realtime import programarEventoChat
    from .models import EstadoParticipante
    EstadoParticipante.objects.filter(conversacion=conv, oculta=True).update(oculta=False)
    programarEventoChat(conv.pk, 'chat.message.created', {'id': message.pk})
    return SendResult(message, True)
