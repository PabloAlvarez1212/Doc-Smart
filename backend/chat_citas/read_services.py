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
    own = 'emisor_medico_id' if kind == 'medico' else 'emisor_usuario_id'
    from .participant_services import mensajesVisibles
    from .participant_services import estadoParticipante
    flag = 'leido_medico' if kind == 'medico' else 'leido_paciente'
    return mensajesVisibles(conversacion, actor).filter(pk__gt=estadoParticipante(conversacion, actor).ultimo_leido_id, **{flag: False}).exclude(**{own: pk})


def contarNoLeidos(conversacion, actor):
    return mensajesNoLeidos(conversacion, actor).count()


@transaction.atomic
def marcarLecturaConversacionService(conversacion_id, actor, ultimo_mensaje_id):
    conv, actor = bloquearConversacion(conversacion_id, actor)
    from .participant_services import mensajesVisibles
    visibles = mensajesVisibles(conv, actor)
    if type(ultimo_mensaje_id) is not int or not visibles.filter(pk=ultimo_mensaje_id).exists():
        raise ChatError(400, 'invalid_cursor', 'Mensaje de lectura no válido')
    field = 'ultimo_leido_medico' if identidadActor(actor)[0] == 'medico' else 'ultimo_leido_paciente'
    from .models import EstadoParticipante
    state, _ = EstadoParticipante.objects.get_or_create(conversacion=conv, tipo=identidadActor(actor)[0])
    current = state.ultimo_leido_id
    changed = ultimo_mensaje_id > current
    if changed:
        state.ultimo_leido_id = ultimo_mensaje_id
        state.save(update_fields=['ultimo_leido_id'])
        setattr(conv, field + '_id', max(getattr(conv, field + '_id') or 0, ultimo_mensaje_id))
        conv.save(update_fields=[field])
        from .realtime import programarEventoChat
        kind, pk = identidadActor(actor)
        programarEventoChat(conv.pk, 'chat.message.read',
            {'ultimo_mensaje_id': ultimo_mensaje_id, 'actor': {'tipo': kind, 'id': pk}},
            excluir_actor=(kind, pk))
    return ReadResult(state.ultimo_leido_id, changed, contarNoLeidos(conv, actor))
