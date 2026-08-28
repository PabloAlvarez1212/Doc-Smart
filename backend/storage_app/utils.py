import os
import uuid

from django.utils.text import get_valid_filename


def generar_nombre_unico(nombre_original):
    extension = os.path.splitext(nombre_original)[1].lower()

    return f"{uuid.uuid4().hex}{extension}"


def limpiar_nombre_archivo(nombre):
    return get_valid_filename(nombre)


def construir_ruta(
    categoria,
    nombre_archivo,
    usuario_id=None,
    referencia_id=None,
):
    """
    Ejemplos:

    medical-images/users/42/archivo.png

    chatbot/attachments/15/documento.pdf

    documents/users/42/archivo.pdf
    """

    nombre = generar_nombre_unico(nombre_archivo)

    partes = [categoria]

    if usuario_id:
        partes.extend([
            "users",
            str(usuario_id),
        ])

    if referencia_id:
        partes.append(str(referencia_id))

    partes.append(nombre)

    return "/".join(partes)