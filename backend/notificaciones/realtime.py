"""Invalidaciones administrativas; no crean notificaciones persistentes."""
import logging
from uuid import uuid4

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)
SECCIONES_DASHBOARD = frozenset({
    "resumen", "citas", "medicos", "pacientes", "solicitudes_medicos", "verificaciones",
})


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

def grupo_acceso_cuenta(tipo, cuenta_id):
    if tipo not in ("paciente", "medico"):
        raise ValueError("Tipo de cuenta inválido")
    return f"cuenta_{tipo}_{int(cuenta_id)}"


def programarCierreConexionesCuenta(tipo, cuenta_id):
    grupo = grupo_acceso_cuenta(tipo, cuenta_id)

    def cerrar():
        canal = get_channel_layer()
        if canal is None:
            logger.warning("Channel Layer no disponible para cerrar conexiones de cuenta")
            return
        try:
            async_to_sync(canal.group_send)(grupo, {"type": "access_revoked"})
        except Exception:
            logger.exception("No se pudieron cerrar conexiones de %s %s", tipo, cuenta_id)

    transaction.on_commit(cerrar, robust=True)
