from types import SimpleNamespace
from django.db import transaction
from django.db.models import Max
from .models import EstadoParticipante
from .access import identidadActor, bloquearConversacion
from .exceptions import ChatError


def estadoParticipante(conv, actor):
    tipo, _ = identidadActor(actor)
    return EstadoParticipante.objects.filter(conversacion=conv, tipo=tipo).first() or SimpleNamespace(
        archivada=False, oculta=False, visible_despues_id=0, ultimo_leido_id=0)


def mensajesVisibles(conv, actor):
    return conv.mensajes.filter(pk__gt=estadoParticipante(conv, actor).visible_despues_id)


@transaction.atomic
def cambiarEstadoParticipanteService(conversacion_id, actor, accion):
    conv, actor = bloquearConversacion(conversacion_id, actor)
    if accion not in ('archivar', 'desarchivar', 'eliminar'):
        raise ChatError(400, 'invalid_action', 'Acción no válida')
    tipo, _ = identidadActor(actor)
    estado, _ = EstadoParticipante.objects.get_or_create(conversacion=conv, tipo=tipo)
    if accion == 'eliminar':
        estado.visible_despues_id = max(estado.visible_despues_id, conv.mensajes.aggregate(pk=Max('pk'))['pk'] or 0)
        estado.oculta = True
    else:
        estado.archivada = accion == 'archivar'
    estado.save()
    from .realtime import programarEventoChat
    other = ('medico', conv.cita.id_medico_id) if tipo == 'paciente' else ('paciente', conv.cita.id_usuario_id)
    programarEventoChat(conv.pk, 'chat.conversation.updated', {'id': conv.pk}, excluir_actor=other)
    return estado
