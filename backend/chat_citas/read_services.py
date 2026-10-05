from dataclasses import dataclass
from django.db import transaction
from .access import bloquearConversacion, identidadActor
from .exceptions import ChatError
from .models import Mensaje


@dataclass(frozen=True)
class ReadResult:
    ultimo_mensaje_id: int | None
    changed: bool
    no_leidos: int


def mensajesNoLeidos(conversacion, actor):
    kind, pk = identidadActor(actor)
    field = 'ultimo_leido_medico_id' if kind == 'medico' else 'ultimo_leido_paciente_id'
    own = 'emisor_medico_id' if kind == 'medico' else 'emisor_usuario_id'
    return Mensaje.objects.filter(conversacion=conversacion,
        pk__gt=getattr(conversacion, field) or 0).exclude(**{own: pk})


def contarNoLeidos(conversacion, actor):
    return mensajesNoLeidos(conversacion, actor).count()


@transaction.atomic
def marcarLecturaConversacionService(conversacion_id, actor, ultimo_mensaje_id):
    conv, actor = bloquearConversacion(conversacion_id, actor)
    if type(ultimo_mensaje_id) is not int or not Mensaje.objects.filter(
            conversacion=conv, pk=ultimo_mensaje_id).exists():
        raise ChatError(400, 'invalid_cursor', 'Mensaje de lectura no válido')
    field = 'ultimo_leido_medico' if identidadActor(actor)[0] == 'medico' else 'ultimo_leido_paciente'
    current = getattr(conv, field + '_id') or 0
    changed = ultimo_mensaje_id > current
    if changed:
        setattr(conv, field + '_id', ultimo_mensaje_id)
        conv.save(update_fields=[field])
        from .realtime import programarEventoChat
        kind, pk = identidadActor(actor)
        programarEventoChat(conv.pk, 'chat.message.read',
            {'ultimo_mensaje_id': ultimo_mensaje_id, 'actor': {'tipo': kind, 'id': pk}},
            excluir_actor=(kind, pk))
    return ReadResult(getattr(conv, field + '_id'), changed, contarNoLeidos(conv, actor))
