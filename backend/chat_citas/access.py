from django.db import connection
from medicos.models import Medico
from users.models import Usuario
from .models import Conversacion
from .exceptions import ChatError
from .services import _bloquear_cita, puedeVerConversacionService, resolverConversacion


def identidadActor(actor):
    if isinstance(actor, Medico):
        return 'medico', actor.pk
    if isinstance(actor, Usuario):
        return 'paciente', actor.pk
    raise ChatError(403, 'forbidden', 'Participante no autorizado')


def actorVigente(actor):
    if not getattr(actor, 'is_authenticated', False):
        raise ChatError(
            403,
            'forbidden',
            'Autenticación requerida'
        )

    kind, pk = identidadActor(actor)

    model = (
        Medico
        if kind == 'medico'
        else Usuario
    )

    fresh = (
        model.objects
        .select_related('id_rol')
        .filter(pk=pk)
        .first()
    )

    if fresh is None:
        raise ChatError(
            403,
            'forbidden',
            'Participante no autorizado'
        )

    roles_validos = {
        'paciente': {'paciente'},
        'medico': {'doctor', 'medico'},
    }

    rol_actual = fresh.id_rol.nombre.strip().lower()

    if rol_actual not in roles_validos[kind]:
        raise ChatError(
            403,
            'forbidden',
            'Participante no autorizado'
        )
    return fresh

def _autorizar(conv, actor):
    fresh = actorVigente(actor)
    if not puedeVerConversacionService(conv, fresh):
        raise ChatError(403, 'forbidden', 'No tienes acceso a esta conversación')
    return conv, fresh


def cargarConversacionVisible(conversacion_id, actor):
    actor = actorVigente(actor)
    conv = resolverConversacion(conversacion_id)
    if conv is None:
        raise ChatError(404, 'not_found', 'Conversación no encontrada')
    return _autorizar(conv, actor)


def bloquearConversacion(conversacion_id, actor):
    if not connection.in_atomic_block:
        raise RuntimeError('Se requiere una transacción')
    actor = actorVigente(actor)
    base = resolverConversacion(conversacion_id)
    cita_id = base.cita_id if base else None
    if cita_id is None:
        raise ChatError(404, 'not_found', 'Conversación no encontrada')
    cita = _bloquear_cita(cita_id)
    conv = Conversacion.objects.select_for_update().filter(pk=base.pk).first()
    if conv is None or cita is None or conv.cita_id != cita.pk:
        raise ChatError(409, 'changed', 'La conversación cambió; reintenta')
    conv.cita = cita
    return _autorizar(conv, actor)
