import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from citas.serializers import CitaSerializer

logger = logging.getLogger(__name__)

def programarActualizacionCitaRealtime(cita):
    grupos = (
        f"medico_{cita.id_medico_id}",
        f"user_{cita.id_usuario_id}",
    )
    evento = {
        "type": "send_appointment_update",
        "tipo_evento": "ACTUALIZACION_CITA",
        "cita": dict(CitaSerializer(cita).data),
    }

    def emitir():
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.warning(
                "No hay Channel Layer para actualizar la cita %s",
                cita.pk,
            )
            return
        for grupo in grupos:
            try:
                async_to_sync(
                    channel_layer.group_send
                )(grupo, evento)
            except Exception:
                logger.exception(
                    "Error enviando actualización de cita %s al grupo %s",
                    cita.pk,
                    grupo,
                )

    transaction.on_commit(
        emitir,
        robust=True,
    )