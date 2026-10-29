# chat_citas/emails.py

import os
import logging
from citas.models import Cita
from django.utils import timezone
from chat_citas.models import Conversacion
from notificaciones.email_citas_services import enviarCorreoCita

logger = logging.getLogger(__name__)


def enviarCorreoChatHabilitado(cita_id):
    """
    Notifica al paciente cuando el médico
    habilita anticipadamente la conversación.
    """

    cita = (
        Cita.objects
        .select_related(
            "id_usuario",
            "id_medico",
            "id_estado"
        )
        .filter(pk=cita_id)
        .first()
    )

    if not cita:
        logger.warning(
            "No se envió correo: cita %s no encontrada.",
            cita_id
        )
        return False

    if not cita.fecha_chat_habilitacion:
        logger.warning(
            "La cita %s no tiene habilitación anticipada.",
            cita_id
        )
        return False

    paciente = cita.id_usuario
    medico = cita.id_medico

    nombre_medico = (
        f"{medico.nombre} {medico.apellido}"
    )

    fecha_local = timezone.localtime(
        cita.fecha_programada
    )

    fecha_cita = fecha_local.strftime("%d/%m/%Y")
    hora_cita = fecha_local.strftime("%I:%M %p")

    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    contexto = {
        "titulo": "Tu conversación médica ya está disponible",

        "nombre": paciente.nombre,

        "mensaje": (
            f"El Dr. {nombre_medico} ha habilitado "
            "anticipadamente la conversación de tu cita médica. "
            "Ya puedes ingresar a DocSmart para comunicarte "
            "con tu médico."
        ),

        "codigo_cita": cita.codigo_cita,

        "profesional": nombre_medico,

        "fecha": fecha_cita,

        "hora": hora_cita,

        "estado": cita.id_estado.nombre,

        "mensaje_adicional": (
            "La conversación ha sido habilitada antes "
            "de su horario habitual. Puedes ingresar "
            "a DocSmart para comenzar a comunicarte "
            "con tu médico."
        ),

        "url_citas": (
            f"{frontend_url}/patient/my-appointments"
            if frontend_url else None
        ),
    }

    return enviarCorreoCita(
        destinatario=paciente.correo,
        asunto="Tu chat médico está disponible - DocSmart",
        contexto=contexto
    )
    
def enviarCorreoChatDeshabilitado(cita_id):
    cita = (
        Cita.objects
        .select_related(
            "id_usuario",
            "id_medico",
            "id_estado"
        )
        .filter(pk=cita_id)
        .first()
    )

    if not cita:
        return False

    paciente = cita.id_usuario
    medico = cita.id_medico

    fecha_local = timezone.localtime(
        cita.fecha_programada
    )

    nombre_medico = f"{medico.nombre} {medico.apellido}"

    contexto = {
        "titulo": "Acceso anticipado al chat deshabilitado",
        "nombre": paciente.nombre,
        "mensaje": (
            f"El Dr. {nombre_medico} ha deshabilitado "
            "el acceso anticipado a tu conversación médica. "
            "Podrás utilizar nuevamente el chat durante "
            "el horario habitual establecido para tus citas."
        ),
        "codigo_cita": cita.codigo_cita,
        "profesional": nombre_medico,
        "fecha": fecha_local.strftime("%d/%m/%Y"),
        "hora": fecha_local.strftime("%I:%M %p"),
        "estado": cita.id_estado.nombre,
        "url_citas": (
            f"{os.getenv('FRONTEND_URL', '').rstrip('/')}"
            "/patient/my-appointments"
        )
    }

    return enviarCorreoCita(
        destinatario=paciente.correo,
        asunto="Acceso anticipado al chat deshabilitado - DocSmart",
        contexto=contexto
    )