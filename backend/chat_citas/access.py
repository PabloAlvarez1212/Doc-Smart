from django.db import connection
from medicos.models import Medico
from users.models import Usuario
from .models import Conversacion
from .exceptions import ChatError
from .services import _bloquear_cita, puedeVerConversacionService


def identidadActor(actor):
    if isinstance(actor, Medico):
        return 'medico', actor.pk
    if isinstance(actor, Usuario):
        return 'paciente', actor.pk
    raise ChatError(403, 'forbidden', 'Participante no autorizado')


def actorVigente(actor):
    if not getattr(actor, 'is_authenticated', False):
        raise ChatError(403, 'forbidden', 'Autenticación requerida')
    kind, pk = identidadActor(actor)
    model = Medico if kind == 'medico' else Usuario
    fresh = model.objects.select_related('id_rol').filter(pk=pk).first()
    if fresh is None or fresh.id_rol.nombre != kind:
        raise ChatError(403, 'forbidden', 'Participante no autorizado')
    return fresh


def _autorizar(conv, actor):
    fresh = actorVigente(actor)
    if not puedeVerConversacionService(conv, fresh):
        raise ChatError(403, 'forbidden', 'No tienes acceso a esta conversación')
    return conv, fresh


def cargarConversacionVisible(conversacion_id, actor):
    actor = actorVigente(actor)
    conv = Conversacion.objects.select_related('cita__id_estado', 'cita__id_medico',
                                               'cita__id_usuario').filter(pk=conversacion_id).first()
    if conv is None:
        raise ChatError(404, 'not_found', 'Conversación no encontrada')
    return _autorizar(conv, actor)


def bloquearConversacion(conversacion_id, actor):
    if not connection.in_atomic_block:
        raise RuntimeError('Se requiere una transacción')
    actor = actorVigente(actor)
    cita_id = Conversacion.objects.filter(pk=conversacion_id).values_list('cita_id', flat=True).first()
    if cita_id is None:
        raise ChatError(404, 'not_found', 'Conversación no encontrada')
    cita = _bloquear_cita(cita_id)
    conv = Conversacion.objects.select_for_update().filter(pk=conversacion_id).first()
    if conv is None or cita is None or conv.cita_id != cita.pk:
        raise ChatError(409, 'changed', 'La conversación cambió; reintenta')
    conv.cita = cita
    return _autorizar(conv, actor)
