"""Avisos de cambio de acceso enviados después de confirmar la transacción."""

import logging
import os

import resend
from django.db import transaction
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def programar_correo_cambio_acceso(*, cuenta_id, correo, nombre, bloqueado, motivo=""):
    if not correo:
        logger.warning("Cuenta %s sin correo para aviso de cambio de acceso", cuenta_id)
        return

    def enviar():
        try:
            remitente = os.getenv("RESEND_FROM_EMAIL")
            clave = os.getenv("RESEND_API_KEY")
            if not remitente or not clave:
                raise RuntimeError("Proveedor de correo no configurado")
            resend.api_key = clave

            plantilla = "emails/acceso_bloqueado.html" if bloqueado else "emails/acceso_desbloqueado.html"
            asunto = "Tu cuenta de DocSmart fue bloqueada" if bloqueado else "Tu cuenta de DocSmart fue desbloqueada"
            contexto = {"nombre": nombre, "motivo": motivo}
            texto = (
                f"Hola {nombre}. Tu cuenta de DocSmart fue bloqueada. Motivo: {motivo}. "
                "Si necesitas ayuda, comunícate con el soporte de DocSmart."
                if bloqueado else
                f"Hola {nombre}. Tu cuenta de DocSmart fue desbloqueada. Ya puedes ingresar de nuevo."
            )
            resend.Emails.send({
                "from": remitente,
                "to": [correo],
                "subject": asunto,
                "html": render_to_string(plantilla, contexto),
                "text": texto,
            })
        except Exception as error:
            logger.warning(
                "No se pudo enviar aviso de cambio de acceso para cuenta %s: %s",
                cuenta_id, type(error).__name__,
            )

    transaction.on_commit(enviar, robust=True)
