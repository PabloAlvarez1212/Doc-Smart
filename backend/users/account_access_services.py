"""Reglas de bloqueo de cuentas administradas."""

from django.db import transaction
from django.utils import timezone

from medicos.models import Medico
from notificaciones.realtime import (
    programarActualizacionDashboardRealtime,
    programarCierreConexionesCuenta,
)
from users.account_access_email import programar_correo_cambio_acceso
from users.models import Usuario


class CuentaNoEncontrada(Exception):
    pass


class EstadoCuentaSinCambio(Exception):
    pass


def cambiar_acceso_cuenta(tipo, cuenta_id, bloquear, motivo=""):
    modelo = {"paciente": Usuario, "medico": Medico}.get(tipo)
    if modelo is None:
        raise CuentaNoEncontrada()

    with transaction.atomic():
        cuentas = modelo.objects.select_for_update()
        if tipo == "paciente":
            cuentas = cuentas.filter(id_rol__nombre="paciente")
        cuenta = cuentas.filter(pk=cuenta_id).first()
        if cuenta is None:
            raise CuentaNoEncontrada()
        if cuenta.acceso_bloqueado == bloquear:
            raise EstadoCuentaSinCambio()

        cuenta.acceso_bloqueado = bloquear
        cuenta.motivo_bloqueo = motivo if bloquear else ""
        cuenta.bloqueado_en = timezone.now() if bloquear else None
        cuenta.save(update_fields=["acceso_bloqueado", "motivo_bloqueo", "bloqueado_en"])

        if bloquear:
            programarCierreConexionesCuenta(tipo, cuenta.pk)

        programar_correo_cambio_acceso(
            cuenta_id=cuenta.pk,
            correo=cuenta.correo,
            nombre=cuenta.nombre,
            bloqueado=bloquear,
            motivo=motivo if bloquear else "",
        )

        programarActualizacionDashboardRealtime(
            "CUENTA_BLOQUEADA" if bloquear else "CUENTA_DESBLOQUEADA",
            {"resumen", "pacientes" if tipo == "paciente" else "medicos"},
        )

    return {"acceso_bloqueado": bloquear}
