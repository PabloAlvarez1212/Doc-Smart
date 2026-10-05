from django.db import connection
from .models import Conversacion, Mensaje
from .services import _obtener_estado
from .realtime import programarEventoChat


def registrarEventoConversacionService(cita, *, clave, evento, metadata, instante):
    if not connection.in_atomic_block:
        raise RuntimeError('El evento requiere la transacción clínica')
    conv = Conversacion.objects.select_for_update().filter(cita=cita).first()
    if conv is None:
        return None
    conv.cita = cita
    snapshot = dict(metadata, evento=evento, instante=instante.isoformat())
    message, created = Mensaje.objects.get_or_create(conversacion=conv, clave_evento=clave,
        defaults={'tipo': 'sistema', 'contenido': '', 'metadata': snapshot})
    if created:
        programarEventoChat(conv.pk, 'chat.message.created', {'id': message.pk})
        state = _obtener_estado(conv, instante)
        state = {key: value.isoformat() if hasattr(value, 'isoformat') else value for key, value in state.items()}
        programarEventoChat(conv.pk, 'chat.conversation.updated', dict(state, id=conv.pk))
    return message
