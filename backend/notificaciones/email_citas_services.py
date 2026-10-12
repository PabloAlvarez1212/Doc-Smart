import os
import logging
import resend

from django.template.loader import render_to_string
from django.utils import timezone

from citas.models import Cita

logger = logging.getLogger(__name__)

resend.api_key = os.getenv("RESEND_API_KEY")


def enviarCorreoCita(
    destinatario,
    asunto,
    contexto
):
    """
    Envía un correo de citas mediante Resend.
    """

    if not destinatario:
        logger.warning(
            "No se envió el correo: destinatario vacío."
        )
        return False

    try:
        html_content = render_to_string(
            "emails/cita_notificacion.html",
            contexto
        )

        respuesta = resend.Emails.send({
            "from": os.getenv("RESEND_FROM_EMAIL"),
            "to": [destinatario],
            "subject": asunto,
            "html": html_content,
        })

        logger.info(
            "Correo de cita aceptado por Resend: %s",
            respuesta
        )

        return True

    except Exception:
        logger.exception(
            "Error enviando correo de cita a %s",
            destinatario
        )

        return False
    
def enviarCorreosCitaProgramada(cita_id):
    """
    Envía correos al paciente y al médico
    cuando se programa una nueva cita.
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
            "No se enviaron correos: cita %s no encontrada.",
            cita_id
        )
        return

    paciente = cita.id_usuario
    medico = cita.id_medico

    fecha_cita = (
        timezone.localtime(cita.fecha_programada)
        .strftime("%d/%m/%Y")
    )

    hora_cita = (
        timezone.localtime(cita.fecha_programada)
        .strftime("%I:%M %p")
    )

    fecha_limite = (
        timezone.localtime(cita.fecha_limite_confirmacion)
        .strftime("%d/%m/%Y a las %I:%M %p")
    )

    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    nombre_paciente = (
        f"{paciente.nombre} {paciente.apellido}"
    )

    nombre_medico = (
        f"{medico.nombre} {medico.apellido}"
    )

    # -----------------------------------
    # CORREO PARA EL PACIENTE
    # -----------------------------------

    contexto_paciente = {
        "titulo": "Tu cita ha sido solicitada",
        "nombre": paciente.nombre,
        "mensaje": (
            "Tu solicitud de cita médica fue "
            "registrada correctamente. "
            "El médico deberá confirmarla."
        ),
        "codigo_cita": cita.codigo_cita,
        "profesional": nombre_medico,
        "fecha": fecha_cita,
        "hora": hora_cita,
        "estado": "Pendiente",
        "mensaje_adicional": (
            "Te notificaremos cuando el "
            "médico confirme tu solicitud."
        ),
        "url_citas": (
            f"{frontend_url}/patient/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=paciente.correo,
        asunto="Tu cita fue solicitada - DocSmart",
        contexto=contexto_paciente
    )

    # -----------------------------------
    # CORREO PARA EL MÉDICO
    # -----------------------------------

    contexto_medico = {
        "titulo": "Nueva solicitud de cita",
        "nombre": medico.nombre,
        "mensaje": (
            f"El paciente {nombre_paciente} "
            "ha solicitado una cita médica contigo."
        ),
        "codigo_cita": cita.codigo_cita,
        "profesional": nombre_medico,
        "paciente": nombre_paciente,
        "fecha": fecha_cita,
        "hora": hora_cita,
        "estado": "Pendiente",
        "mensaje_adicional": (
            "Debes confirmar esta solicitud "
            f"antes del {fecha_limite}."
        ),
        "url_citas": (
            f"{frontend_url}/doctor/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=medico.correo,
        asunto="Nueva solicitud de cita - DocSmart",
        contexto=contexto_medico
    )
    
def enviarCorreosCitaConfirmada(cita_id):
    """
    Envía correos al paciente y al médico
    cuando una cita médica es confirmada.
    """

    # 1. Obtener cita y relaciones
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
            "No se enviaron correos de confirmación: "
            "la cita %s no existe.",
            cita_id
        )
        return

    # 2. Verificar que la cita esté confirmada
    estado = cita.id_estado.nombre.strip().lower()

    if estado != "confirmada":
        logger.warning(
            "No se enviaron correos: "
            "la cita %s no está confirmada.",
            cita_id
        )
        return

    # 3. Obtener paciente y médico
    paciente = cita.id_usuario
    medico = cita.id_medico

    nombre_paciente = (
        f"{paciente.nombre} {paciente.apellido}"
    )

    nombre_medico = (
        f"{medico.nombre} {medico.apellido}"
    )

    # 4. Formatear fecha y hora
    fecha_local = timezone.localtime(
        cita.fecha_programada
    )

    fecha_cita = fecha_local.strftime(
        "%d/%m/%Y"
    )

    hora_cita = fecha_local.strftime(
        "%I:%M %p"
    )

    # 5. Obtener URL del frontend
    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    # -----------------------------------
    # 6. CORREO PARA EL PACIENTE
    # -----------------------------------

    contexto_paciente = {
        "titulo": "¡Tu cita médica ha sido confirmada!",
        "nombre": paciente.nombre,
        "mensaje": (
            f"El Dr. {nombre_medico} ha confirmado "
            "tu solicitud de cita médica. "
            "Tu consulta ya se encuentra programada "
            "y confirmada en DocSmart."
        ),
        "codigo_cita": cita.codigo_cita,
        "profesional": nombre_medico,
        "fecha": fecha_cita,
        "hora": hora_cita,
        "estado": "Confirmada",
        "mensaje_adicional": (
            "Te recomendamos presentarte puntualmente "
            "a tu consulta y revisar los detalles "
            "de tu cita desde DocSmart."
        ),
        "url_citas": (
            f"{frontend_url}/patient/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=paciente.correo,
        asunto=(
            "Tu cita médica ha sido confirmada - DocSmart"
        ),
        contexto=contexto_paciente
    )

    # -----------------------------------
    # 7. CORREO PARA EL MÉDICO
    # -----------------------------------

    contexto_medico = {
        "titulo": "Has confirmado una cita médica",
        "nombre": medico.nombre,
        "mensaje": (
            f"Has confirmado correctamente "
            f"la cita médica del paciente "
            f"{nombre_paciente}. "
            "La consulta ya aparece como confirmada "
            "en tu agenda de DocSmart."
        ),
        "codigo_cita": cita.codigo_cita,
        "paciente": nombre_paciente,
        "profesional": nombre_medico,
        "fecha": fecha_cita,
        "hora": hora_cita,
        "estado": "Confirmada",
        "mensaje_adicional": (
            "Puedes ingresar a DocSmart para "
            "consultar la información de la cita "
            "y gestionar la atención del paciente."
        ),
        "url_citas": (
            f"{frontend_url}/doctor/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=medico.correo,
        asunto=(
            "Has confirmado una cita médica - DocSmart"
        ),
        contexto=contexto_medico
    )

def enviarCorreosCitaReprogramada(cita_id, fecha_anterior):
    """
    Envía correos al paciente y al médico cuando
    una cita cambia de fecha.

    Recibe:
        cita_id: identificador de la cita.
        fecha_anterior: fecha que tenía antes de reprogramarse.
    """

    # 1. Obtener la cita con sus relaciones
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
            "No se enviaron correos de reprogramación: "
            "la cita %s no existe.",
            cita_id
        )
        return

    # 2. Verificar el estado
    estado = cita.id_estado.nombre.strip().lower()

    if estado != "reprogramada":
        logger.warning(
            "No se enviaron correos: "
            "la cita %s no está reprogramada.",
            cita_id
        )
        return

    # 3. Obtener los participantes
    paciente = cita.id_usuario
    medico = cita.id_medico

    nombre_paciente = (
        f"{paciente.nombre} {paciente.apellido}"
    )

    nombre_medico = (
        f"{medico.nombre} {medico.apellido}"
    )

    # 4. Convertir las fechas a la zona horaria local
    fecha_anterior_local = timezone.localtime(
        fecha_anterior
    )

    fecha_nueva_local = timezone.localtime(
        cita.fecha_programada
    )

    # 5. Formatear fecha anterior
    fecha_anterior_fmt = fecha_anterior_local.strftime(
        "%d/%m/%Y"
    )

    hora_anterior_fmt = fecha_anterior_local.strftime(
        "%I:%M %p"
    )

    # 6. Formatear la nueva fecha
    fecha_nueva_fmt = fecha_nueva_local.strftime(
        "%d/%m/%Y"
    )

    hora_nueva_fmt = fecha_nueva_local.strftime(
        "%I:%M %p"
    )

    # 7. Formatear el plazo de confirmación
    limite_confirmacion_fmt = None

    if cita.fecha_limite_confirmacion:
        limite_confirmacion_fmt = (
            timezone.localtime(
                cita.fecha_limite_confirmacion
            ).strftime("%d/%m/%Y a las %I:%M %p")
        )

    # 8. Obtener URL del frontend
    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    # =====================================
    # CORREO PARA EL PACIENTE
    # =====================================

    contexto_paciente = {
        "titulo": "Tu cita médica ha sido reprogramada",

        "nombre": paciente.nombre,

        "mensaje": (
            f"Tu cita médica con el Dr. {nombre_medico} "
            "ha cambiado de fecha. "
            "A continuación, encontrarás los detalles "
            "de la programación anterior y la nueva."
        ),

        "codigo_cita": cita.codigo_cita,

        "profesional": nombre_medico,

        "fecha_anterior": fecha_anterior_fmt,

        "hora_anterior": hora_anterior_fmt,

        "fecha": fecha_nueva_fmt,

        "hora": hora_nueva_fmt,

        "estado": "Reprogramada",

        "mensaje_adicional": (
            "La nueva fecha se encuentra pendiente de "
            "confirmación por parte del médico. "
            "Te notificaremos cuando la cita sea confirmada. "
            "Puedes consultar su estado desde DocSmart."
        ),

        "url_citas": (
            f"{frontend_url}/patient/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=paciente.correo,

        asunto=(
            "Tu cita médica ha sido reprogramada - DocSmart"
        ),

        contexto=contexto_paciente
    )

    # =====================================
    # CORREO PARA EL MÉDICO
    # =====================================

    contexto_medico = {
        "titulo": "Una cita médica ha sido reprogramada",

        "nombre": medico.nombre,

        "mensaje": (
            f"La cita médica con el paciente "
            f"{nombre_paciente} ha cambiado de fecha. "
            "Debes revisar el nuevo horario y confirmar "
            "la cita dentro del plazo establecido."
        ),

        "codigo_cita": cita.codigo_cita,

        "paciente": nombre_paciente,

        "profesional": nombre_medico,

        "fecha_anterior": fecha_anterior_fmt,

        "hora_anterior": hora_anterior_fmt,

        "fecha": fecha_nueva_fmt,

        "hora": hora_nueva_fmt,

        "estado": "Reprogramada",

        "mensaje_adicional": (
            "Recuerda que debes confirmar nuevamente "
            "esta cita antes del "
            f"{limite_confirmacion_fmt}. "
            "Si no la confirmas dentro del plazo, "
            "la solicitud vencerá."
            if limite_confirmacion_fmt
            else (
                "Recuerda que debes confirmar nuevamente "
                "esta cita desde tu agenda en DocSmart."
            )
        ),

        "url_citas": (
            f"{frontend_url}/doctor/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=medico.correo,

        asunto=(
            "Una cita médica ha sido reprogramada - DocSmart"
        ),

        contexto=contexto_medico
    )

def enviarCorreosCitaCancelada(cita_id, cancelada_por):
    """
    Envía correos al paciente y al médico
    cuando una cita es cancelada.

    Parámetros:
        cita_id: ID de la cita cancelada.

        cancelada_por:
            'paciente' o 'medico'.
    """

    # 1. Obtener cita y relaciones
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
            "No se enviaron correos de cancelación: "
            "la cita %s no existe.",
            cita_id
        )
        return

    # 2. Verificar que esté cancelada
    estado = cita.id_estado.nombre.strip().lower()

    if estado != "cancelada":
        logger.warning(
            "No se enviaron correos: "
            "la cita %s no está cancelada.",
            cita_id
        )
        return

    # 3. Validar quién canceló
    if cancelada_por not in ("paciente", "medico"):
        logger.warning(
            "Actor de cancelación inválido para la cita %s",
            cita_id
        )
        return

    # 4. Obtener paciente y médico
    paciente = cita.id_usuario
    medico = cita.id_medico

    nombre_paciente = (
        f"{paciente.nombre} {paciente.apellido}"
    )

    nombre_medico = (
        f"{medico.nombre} {medico.apellido}"
    )

    # 5. Fecha que tenía programada la cita
    fecha_programada_local = timezone.localtime(
        cita.fecha_programada
    )

    fecha_cita = fecha_programada_local.strftime(
        "%d/%m/%Y"
    )

    hora_cita = fecha_programada_local.strftime(
        "%I:%M %p"
    )

    # 6. Fecha en que fue cancelada
    fecha_cancelacion_fmt = None

    if cita.fecha_cancelacion:
        fecha_cancelacion_fmt = (
            timezone.localtime(
                cita.fecha_cancelacion
            ).strftime("%d/%m/%Y a las %I:%M %p")
        )

    # 7. Identificar quién canceló
    cancelada_por_texto = (
        "Paciente"
        if cancelada_por == "paciente"
        else "Médico"
    )

    # 8. URL del frontend
    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    # ===================================
    # 9. PERSONALIZAR LOS MENSAJES
    # ===================================

    if cancelada_por == "paciente":

        titulo_paciente = (
            "Has cancelado tu cita médica"
        )

        mensaje_paciente = (
            f"Has cancelado tu cita médica con "
            f"el Dr. {nombre_medico}. "
            "La cancelación se registró correctamente "
            "en DocSmart."
        )

        titulo_medico = (
            "Un paciente ha cancelado su cita"
        )

        mensaje_medico = (
            f"El paciente {nombre_paciente} "
            "ha cancelado su cita médica. "
            "Esta consulta ya no se encuentra "
            "programada en tu agenda."
        )

    else:

        titulo_paciente = (
            "Tu cita médica ha sido cancelada"
        )

        mensaje_paciente = (
            f"El Dr. {nombre_medico} "
            "ha cancelado tu cita médica. "
            "Puedes ingresar a DocSmart "
            "para consultar el estado de tus citas "
            "y solicitar una nueva consulta."
        )

        titulo_medico = (
            "Has cancelado una cita médica"
        )

        mensaje_medico = (
            f"Has cancelado la cita médica "
            f"del paciente {nombre_paciente}. "
            "La cancelación se registró "
            "correctamente en DocSmart."
        )

    # ===================================
    # 10. CORREO PARA EL PACIENTE
    # ===================================

    contexto_paciente = {
        "titulo": titulo_paciente,

        "nombre": paciente.nombre,

        "mensaje": mensaje_paciente,

        "codigo_cita": cita.codigo_cita,

        "profesional": nombre_medico,

        "fecha": fecha_cita,

        "hora": hora_cita,

        "estado": "Cancelada",

        "fecha_cancelacion": fecha_cancelacion_fmt,

        "cancelada_por": cancelada_por_texto,

        "mensaje_adicional": (
            "Esta cita ya no se encuentra activa. "
            "Si necesitas atención médica, "
            "puedes solicitar una nueva cita "
            "desde DocSmart."
        ),

        "url_citas": (
            f"{frontend_url}/patient/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=paciente.correo,

        asunto=(
            "Tu cita médica ha sido cancelada - DocSmart"
        ),

        contexto=contexto_paciente
    )

    # ===================================
    # 11. CORREO PARA EL MÉDICO
    # ===================================

    contexto_medico = {
        "titulo": titulo_medico,

        "nombre": medico.nombre,

        "mensaje": mensaje_medico,

        "codigo_cita": cita.codigo_cita,

        "paciente": nombre_paciente,

        "profesional": nombre_medico,

        "fecha": fecha_cita,

        "hora": hora_cita,

        "estado": "Cancelada",

        "fecha_cancelacion": fecha_cancelacion_fmt,

        "cancelada_por": cancelada_por_texto,

        "mensaje_adicional": (
            "Esta cita ha sido cancelada y "
            "ya no requiere atención. "
            "Puedes consultar tu agenda "
            "desde DocSmart."
        ),

        "url_citas": (
            f"{frontend_url}/doctor/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=medico.correo,

        asunto=(
            "Una cita médica ha sido cancelada - DocSmart"
        ),

        contexto=contexto_medico
    )

def enviarCorreosCitaVencida(cita_id):
    """
    Envía correos al paciente y al médico cuando
    una cita vence por falta de confirmación.

    Aplica a solicitudes que estaban pendientes
    o reprogramadas y no fueron confirmadas
    dentro del plazo establecido.
    """

    # 1. Obtener cita y relaciones
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
            "No se enviaron correos de vencimiento: "
            "la cita %s no existe.",
            cita_id
        )
        return

    # 2. Verificar que la cita esté vencida
    estado_actual = cita.id_estado.nombre.strip().lower()

    if estado_actual != "vencida":
        logger.warning(
            "No se enviaron correos: "
            "la cita %s no está vencida.",
            cita_id
        )
        return

    # 3. Obtener paciente y médico
    paciente = cita.id_usuario
    medico = cita.id_medico

    nombre_paciente = (
        f"{paciente.nombre} {paciente.apellido}"
    )

    nombre_medico = (
        f"{medico.nombre} {medico.apellido}"
    )

    # 4. Fecha original de la consulta
    fecha_programada_local = timezone.localtime(
        cita.fecha_programada
    )

    fecha_cita = fecha_programada_local.strftime(
        "%d/%m/%Y"
    )

    hora_cita = fecha_programada_local.strftime(
        "%I:%M %p"
    )

    # 5. Fecha de vencimiento
    fecha_vencimiento_fmt = None

    if cita.fecha_vencimiento:
        fecha_vencimiento_fmt = (
            timezone.localtime(
                cita.fecha_vencimiento
            ).strftime("%d/%m/%Y a las %I:%M %p")
        )

    # 6. Fecha límite de confirmación
    limite_confirmacion_fmt = None

    if cita.fecha_limite_confirmacion:
        limite_confirmacion_fmt = (
            timezone.localtime(
                cita.fecha_limite_confirmacion
            ).strftime("%d/%m/%Y a las %I:%M %p")
        )

    # 7. URL del frontend
    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    # =====================================
    # CORREO PARA EL PACIENTE
    # =====================================

    contexto_paciente = {
        "titulo": "Tu solicitud de cita médica ha vencido",

        "nombre": paciente.nombre,

        "mensaje": (
            f"Tu solicitud de cita médica con "
            f"el Dr. {nombre_medico} ha vencido "
            "porque no fue confirmada por el médico "
            "dentro del plazo establecido."
        ),

        "codigo_cita": cita.codigo_cita,

        "profesional": nombre_medico,

        "fecha": fecha_cita,

        "hora": hora_cita,

        "estado": "Vencida",

        "fecha_vencimiento": fecha_vencimiento_fmt,

        "motivo_vencimiento": (
            "Falta de confirmación dentro del plazo"
        ),

        "mensaje_adicional": (
            "Esta solicitud ya no se encuentra activa. "
            "Si todavía necesitas atención médica, "
            "puedes solicitar una nueva cita "
            "desde DocSmart."
        ),

        "url_citas": (
            f"{frontend_url}/patient/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=paciente.correo,

        asunto=(
            "Tu solicitud de cita médica ha vencido - DocSmart"
        ),

        contexto=contexto_paciente
    )

    # =====================================
    # CORREO PARA EL MÉDICO
    # =====================================

    contexto_medico = {
        "titulo": "Una solicitud de cita médica ha vencido",

        "nombre": medico.nombre,

        "mensaje": (
            f"La solicitud de cita del paciente "
            f"{nombre_paciente} ha vencido "
            "porque no fue confirmada dentro "
            "del plazo establecido."
        ),

        "codigo_cita": cita.codigo_cita,

        "paciente": nombre_paciente,

        "profesional": nombre_medico,

        "fecha": fecha_cita,

        "hora": hora_cita,

        "estado": "Vencida",

        "fecha_vencimiento": fecha_vencimiento_fmt,

        "fecha_limite_confirmacion": (
            limite_confirmacion_fmt
        ),

        "motivo_vencimiento": (
            "Falta de confirmación dentro del plazo"
        ),

        "mensaje_adicional": (
            "La solicitud ya no puede confirmarse. "
            "Para evitar futuros vencimientos, "
            "revisa las solicitudes pendientes "
            "y reprogramadas desde tu agenda "
            "de DocSmart."
        ),

        "url_citas": (
            f"{frontend_url}/doctor/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=medico.correo,

        asunto=(
            "Una solicitud de cita médica ha vencido - DocSmart"
        ),

        contexto=contexto_medico
    )
    
def enviarCorreosCitaCompletada(cita_id):
    """
    Envía correos al paciente y al médico
    cuando una cita médica es completada.
    """

    # 1. Obtener cita y relaciones
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
            "No se enviaron correos de finalización: "
            "la cita %s no existe.",
            cita_id
        )
        return

    # 2. Verificar que la cita esté completada
    estado_actual = cita.id_estado.nombre.strip().lower()

    if estado_actual != "completada":
        logger.warning(
            "No se enviaron correos: "
            "la cita %s no está completada.",
            cita_id
        )
        return

    # 3. Obtener paciente y médico
    paciente = cita.id_usuario
    medico = cita.id_medico

    nombre_paciente = (
        f"{paciente.nombre} {paciente.apellido}"
    )

    nombre_medico = (
        f"{medico.nombre} {medico.apellido}"
    )

    # 4. Fecha programada de la consulta
    fecha_programada_local = timezone.localtime(
        cita.fecha_programada
    )

    fecha_cita = fecha_programada_local.strftime(
        "%d/%m/%Y"
    )

    hora_cita = fecha_programada_local.strftime(
        "%I:%M %p"
    )

    # 5. Fecha real de finalización
    fecha_completada_fmt = None

    if cita.fecha_completada:
        fecha_completada_fmt = (
            timezone.localtime(
                cita.fecha_completada
            ).strftime("%d/%m/%Y a las %I:%M %p")
        )

    # 6. URL del frontend
    frontend_url = os.getenv(
        "FRONTEND_URL", ""
    ).rstrip("/")

    # =====================================
    # 7. CORREO PARA EL PACIENTE
    # =====================================

    contexto_paciente = {
        "titulo": "¡Tu cita médica ha sido completada!",

        "nombre": paciente.nombre,

        "mensaje": (
            f"Tu cita médica con el Dr. {nombre_medico} "
            "ha sido registrada exitosamente como completada "
            "en DocSmart. "
            "Además, te informamos que tu historial clínico "
            "correspondiente a esta consulta ya ha sido "
            "generado y se encuentra disponible en nuestra plataforma."
        ),

        "codigo_cita": cita.codigo_cita,

        "profesional": nombre_medico,

        "fecha": fecha_cita,

        "hora": hora_cita,

        "estado": "Completada",

        "fecha_completada": fecha_completada_fmt,

        "mensaje_adicional": (
            "¡Tu historial clínico ya está disponible! "
            "Puedes ingresar a DocSmart para consultar "
            "la información registrada durante tu atención "
            "médica y descargar tu historial clínico "
            "para conservar una copia personal. "
            "Recuerda mantener este documento en un lugar "
            "seguro, ya que contiene información médica personal."
        ),

        "url_citas": (
            f"{frontend_url}/patient/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=paciente.correo,
        asunto=(
            "Tu cita fue completada y tu historial clínico "
            "está disponible - DocSmart"
        ),
        contexto=contexto_paciente
    )

    enviarCorreoCita(
        destinatario=paciente.correo,
        asunto="Tu cita médica ha sido completada - DocSmart",
        contexto=contexto_paciente
    )

    # =====================================
    # 8. CORREO PARA EL MÉDICO
    # =====================================

    contexto_medico = {
        "titulo": "Has completado una cita médica",

        "nombre": medico.nombre,

        "mensaje": (
            f"La cita médica del paciente "
            f"{nombre_paciente} ha sido registrada "
            "correctamente como completada "
            "en DocSmart."
        ),

        "codigo_cita": cita.codigo_cita,

        "paciente": nombre_paciente,

        "profesional": nombre_medico,

        "fecha": fecha_cita,

        "hora": hora_cita,

        "estado": "Completada",

        "fecha_completada": fecha_completada_fmt,

        "mensaje_adicional": (
            "La consulta ha quedado registrada "
            "como completada en tu agenda. "
            "Puedes consultar su información "
            "desde DocSmart."
        ),

        "url_citas": (
            f"{frontend_url}/doctor/my-appointments"
            if frontend_url else None
        ),
    }

    enviarCorreoCita(
        destinatario=medico.correo,
        asunto="Has completado una cita médica - DocSmart",
        contexto=contexto_medico
    )