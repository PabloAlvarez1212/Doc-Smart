import secrets
import string
from django.template.loader import render_to_string
import resend
import os

def generarCodigoCita():
    caracteres = string.ascii_uppercase + string.digits

    codigo = "".join(
        secrets.choice(caracteres)
        for _ in range(8)
    )

    return f"DOC-{codigo}"

def enviarCorreoCita(
    destinatario,
    asunto,
    plantilla,
    contexto
):
    html_content = render_to_string(
        plantilla,
        contexto
    )

    try:
        respuesta = resend.Emails.send({
            "from": os.getenv("RESEND_FROM_EMAIL"),
            "to": [destinatario],
            "subject": asunto,
            "html": html_content,
        })

        return True

    except Exception as e:
        print("Error enviando correo de cita:", repr(e))
        return False