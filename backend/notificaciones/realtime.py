"""Invalidaciones administrativas; no crean notificaciones persistentes."""
import logging
from uuid import uuid4

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)
SECCIONES_DASHBOARD = frozenset({"resumen", "citas", "medicos", "pacientes"})


def programarActualizacionDashboardRealtime(tipo_evento, secciones):
    secciones = sorted(set(secciones))
    if not secciones or not set(secciones) <= SECCIONES_DASHBOARD:
        raise ValueError("Secciones de dashboard inválidas")

    evento = {
        "type": "send_dashboard_update",
        "event_id": str(uuid4()),
        "tipo_evento": tipo_evento,
        "secciones": secciones,
    }

    def emitir():
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.warning("Channel Layer no disponible para dashboard")
            return
        try:
            async_to_sync(channel_layer.group_send)("admin_dashboard", evento)
        except Exception:
            logger.exception("Error enviando invalidación del dashboard: %s", tipo_evento)

    transaction.on_commit(emitir, robust=True)
