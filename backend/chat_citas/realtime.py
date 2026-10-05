import logging
from copy import deepcopy
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)


def _emitir(group, payload):
    try:
        async_to_sync(get_channel_layer().group_send)(group, payload)
    except Exception:
        logger.exception('No se pudo difundir un evento de chat confirmado')


def programarEventoChat(conversacion_id, evento, datos, *, excluir_actor=None):
    payload = deepcopy({'type': 'chat_event', 'event': evento, 'data': datos,
                        'excluir_actor': excluir_actor})
    transaction.on_commit(lambda: _emitir(f'chat_citas_{conversacion_id}', payload), robust=True)
