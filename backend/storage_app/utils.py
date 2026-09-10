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
    propietario_tipo,
    propietario_id,
    referencia_id=None,
):
    """
    Ejemplos:

    medical-images/usuario/42/archivo.png
    hoja_vida/medico/15/documento.pdf
    documentos/usuario/42/archivo.pdf
    """

    nombre = generar_nombre_unico(nombre_archivo)

    partes = [
        categoria,
        propietario_tipo,
        str(propietario_id),
    ]

    if referencia_id:
        partes.append(str(referencia_id))

    partes.append(nombre)

    return "/".join(partes)