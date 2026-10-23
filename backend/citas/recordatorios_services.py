import logging

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from citas.models import Cita, RecordatorioCita

from notificaciones.email_citas_services import (
    enviarCorreoRecordatorioCita
)


logger = logging.getLogger(__name__)


# Configuración de recordatorios
ANTICIPACIONES = {
    "24h": timedelta(hours=24),
    "2h": timedelta(hours=2),
}

# Tiempo máximo permitido después de la hora programada
MAX_RETRASO = timedelta(minutes=30)

# Cantidad máxima de recordatorios procesados por ejecución
LOTE_ENVIO = 100


def programarRecordatoriosCitasService():
    """
    Programa los recordatorios de citas confirmadas.

    - Genera recordatorios de 24 y 2 horas.
    - Evita registros duplicados.
    - Cancela recordatorios desactualizados.
    - Permite recuperar recordatorios cancelados
      cuando vuelven a ser válidos.
    """

    ahora = timezone.now()

    resultado = {
        "creados": 0,
        "cancelados": 0,
        "reactivados": 0,
    }

    # Cancelar recordatorios de citas no confirmadas.
    cancelados = (
        RecordatorioCita.objects
        .filter(
            estado_envio__in=["pendiente", "fallido"]
        )
        .exclude(
            id_cita__id_estado__nombre__iexact="confirmada"
        )
        .update(estado_envio="cancelado")
    )

    resultado["cancelados"] += cancelados

    # Cancelar recordatorios pendientes demasiado antiguos.
    cancelados = (
        RecordatorioCita.objects
        .filter(
            estado_envio="pendiente",
            fecha_programada__lt=ahora - MAX_RETRASO,
        )
        .update(estado_envio="cancelado")
    )

    resultado["cancelados"] += cancelados

    # Obtener identificadores de citas confirmadas futuras.
    citas_ids = (
        Cita.objects
        .filter(
            id_estado__nombre__iexact="confirmada",
            fecha_programada__gt=ahora,
        )
        .values_list("id", flat=True)
        .iterator()
    )

    for cita_id in citas_ids:

        with transaction.atomic():

            # Consultar nuevamente la cita y bloquear
            # su registro durante la programación.
            cita = (
                Cita.objects
                .select_for_update()
                .select_related("id_estado")
                .get(id=cita_id)
            )

            if (
                cita.id_estado.nombre.strip().lower() != "confirmada"
                or cita.fecha_programada <= timezone.now()
            ):
                continue

            for tipo, anticipacion in ANTICIPACIONES.items():

                fecha_envio = cita.fecha_programada - anticipacion

                # Cancelar recordatorios anteriores del mismo tipo
                # cuya fecha ya no corresponda a la cita.
                cancelados = (
                    RecordatorioCita.objects
                    .filter(
                        id_cita=cita,
                        tipo_recordatorio=tipo,
                        estado_envio__in=["pendiente", "fallido"],
                    )
                    .exclude(fecha_programada=fecha_envio)
                    .update(estado_envio="cancelado")
                )

                resultado["cancelados"] += cancelados

                ahora_actual = timezone.now()

                # No programar recordatorios demasiado atrasados.
                if fecha_envio < ahora_actual - MAX_RETRASO:
                    continue

                # Buscar o crear el recordatorio.
                recordatorio, creado = (
                    RecordatorioCita.objects.get_or_create(
                        id_cita=cita,
                        tipo_recordatorio=tipo,
                        fecha_programada=fecha_envio,
                        defaults={
                            "estado_envio": "pendiente",
                            "intentos_envio": 0,
                        }
                    )
                )

                if creado:
                    resultado["creados"] += 1

                # Recuperar un recordatorio cancelado
                # si su programación vuelve a ser válida.
                elif recordatorio.estado_envio == "cancelado":

                    recordatorio.estado_envio = "pendiente"
                    recordatorio.intentos_envio = 0
                    recordatorio.fecha_envio_recordatorio = None
                    recordatorio.fecha_inicio_procesamiento = None

                    recordatorio.save(
                        update_fields=[
                            "estado_envio",
                            "intentos_envio",
                            "fecha_envio_recordatorio",
                            "fecha_inicio_procesamiento",
                        ]
                    )

                    resultado["reactivados"] += 1

    return resultado


def obtenerRecordatoriosPendientesService():
    """
    Obtiene recordatorios pendientes cuya fecha
    programada ya se alcanzó.
    """

    ahora = timezone.now()

    return (
        RecordatorioCita.objects
        .select_related(
            "id_cita",
            "id_cita__id_estado",
            "id_cita__id_usuario",
            "id_cita__id_medico",
        )
        .filter(
            estado_envio="pendiente",
            fecha_programada__lte=ahora,
            id_cita__id_estado__nombre__iexact="confirmada",
            id_cita__fecha_programada__gt=ahora,
        )
        .order_by("fecha_programada")
    )


def recordatorioSigueVigente(recordatorio, ahora):
    """
    Verifica que el recordatorio corresponda
    a una cita confirmada y vigente.
    """

    cita = recordatorio.id_cita

    # La cita debe continuar confirmada.
    if cita.id_estado.nombre.strip().lower() != "confirmada":
        return False

    # La cita todavía no debe haber comenzado.
    if cita.fecha_programada <= ahora:
        return False

    anticipacion = ANTICIPACIONES.get(
        recordatorio.tipo_recordatorio
    )

    if anticipacion is None:
        return False

    # Comprobar que la fecha del recordatorio corresponda
    # a la programación actual de la cita.
    fecha_esperada = cita.fecha_programada - anticipacion

    if recordatorio.fecha_programada != fecha_esperada:
        return False

    # No enviar antes de la hora programada.
    if recordatorio.fecha_programada > ahora:
        return False

    # No enviar recordatorios demasiado antiguos.
    if ahora - recordatorio.fecha_programada > MAX_RETRASO:
        return False

    return True


def enviarRecordatoriosPendientesService():
    """
    Procesa los recordatorios pendientes.

    - Reserva cada recordatorio mediante MySQL.
    - Verifica su vigencia.
    - Envía el correo mediante Resend.
    - Registra el resultado.
    - No reintenta automáticamente envíos fallidos.
    """

    ahora = timezone.now()

    resultado = {
        "enviados": 0,
        "fallidos": 0,
        "cancelados": 0,
    }

    pendientes = list(
        RecordatorioCita.objects
        .filter(
            estado_envio="pendiente",
            fecha_programada__lte=ahora,
        )
        .order_by("fecha_programada")
        .values_list("id", flat=True)[:LOTE_ENVIO]
    )

    for recordatorio_id in pendientes:

        # Permite identificar si el envío externo pudo iniciarse.
        envio_iniciado = False

        try:

            # Reservar el recordatorio.
            with transaction.atomic():

                recordatorio = (
                    RecordatorioCita.objects
                    .select_for_update()
                    .select_related("id_cita__id_estado")
                    .get(id=recordatorio_id)
                )

                # Otro proceso pudo haberlo reservado.
                if recordatorio.estado_envio != "pendiente":
                    continue

                if not recordatorioSigueVigente(
                    recordatorio,
                    timezone.now()
                ):

                    recordatorio.estado_envio = "cancelado"

                    recordatorio.save(
                        update_fields=["estado_envio"]
                    )

                    resultado["cancelados"] += 1

                    continue

                # Reservar el procesamiento.
                recordatorio.estado_envio = "procesando"
                recordatorio.intentos_envio += 1
                # Registrar cuando comenzo realmente
                recordatorio.fecha_inicio_procesamiento = timezone.now()

                recordatorio.save(
                    update_fields=[
                        "estado_envio",
                        "intentos_envio",
                        "fecha_inicio_procesamiento",
                    ]
                )

            # Obtener los datos actualizados de la cita.
            cita = (
                Cita.objects
                .select_related(
                    "id_estado",
                    "id_usuario",
                    "id_medico",
                )
                .get(id=recordatorio.id_cita_id)
            )

            recordatorio.id_cita = cita

            # Segunda comprobación antes del envío.
            if not recordatorioSigueVigente(
                recordatorio,
                timezone.now()
            ):

                actualizados = (
                    RecordatorioCita.objects
                    .filter(
                        id=recordatorio_id,
                        estado_envio="procesando",
                    )
                    .update(estado_envio="cancelado")
                )

                resultado["cancelados"] += actualizados

                continue

            # Enviar el correo fuera de la transacción.
            envio_iniciado = True

            enviado = enviarCorreoRecordatorioCita(
                cita=cita,
                tipo_recordatorio=recordatorio.tipo_recordatorio,
            )

            if enviado:

                actualizados = (
                    RecordatorioCita.objects
                    .filter(
                        id=recordatorio_id,
                        estado_envio="procesando",
                    )
                    .update(
                        estado_envio="enviado",
                        fecha_envio_recordatorio=timezone.now(),
                    )
                )

                resultado["enviados"] += actualizados

                if not actualizados:
                    logger.error(
                        "Resend aceptó el recordatorio %s, "
                        "pero no se pudo registrar como enviado.",
                        recordatorio_id,
                    )

            else:

                actualizados = (
                    RecordatorioCita.objects
                    .filter(
                        id=recordatorio_id,
                        estado_envio="procesando",
                    )
                    .update(estado_envio="fallido")
                )

                resultado["fallidos"] += actualizados

                logger.warning(
                    "No se confirmó el envío del recordatorio %s.",
                    recordatorio_id,
                )

        except Exception:

            logger.exception(
                "Error procesando recordatorio %s",
                recordatorio_id,
            )

            # Si el envío pudo haberse iniciado,
            # no cambiar automáticamente su estado:
            # podría haber sido aceptado por Resend.
            if envio_iniciado:
                logger.error(
                    "El recordatorio %s requiere revisión: "
                    "el resultado del envío puede ser incierto.",
                    recordatorio_id,
                )

            else:

                # Si sabemos que todavía no se inició
                # el envío, registrar el fallo.
                actualizados = (
                    RecordatorioCita.objects
                    .filter(
                        id=recordatorio_id,
                        estado_envio="procesando",
                    )
                    .update(estado_envio="fallido")
                )

                resultado["fallidos"] += actualizados

    return resultado