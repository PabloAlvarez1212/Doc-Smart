import mimetypes

from django.core.exceptions import ValidationError


MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


ALLOWED_MIME_TYPES = {
    # Imágenes
    "image/jpeg",
    "image/png",
    "image/webp",

    # Documentos
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    # Audio
    "audio/mpeg",
    "audio/wav",
    "audio/webm",
    "audio/ogg",

    # Video
    "video/mp4",
    "video/webm",
    "video/quicktime",
}


def validar_tamano_archivo(archivo, max_size=MAX_FILE_SIZE):
    if archivo.size > max_size:
        max_mb = max_size / (1024 * 1024)

        raise ValidationError(
            f"El archivo supera el tamaño máximo permitido de {max_mb:.0f} MB."
        )


def validar_tipo_archivo(archivo, allowed_types=None):
    tipos_permitidos = allowed_types or ALLOWED_MIME_TYPES

    # Primero intenta obtener el content_type real
    content_type = getattr(archivo, "content_type", None)

    # Si Django no lo tiene, intenta determinarlo por la extensión
    if not content_type:
        nombre = getattr(archivo, "name", "")
        content_type, _ = mimetypes.guess_type(nombre)

    if not content_type:
        raise ValidationError(
            "No se pudo determinar el tipo del archivo."
        )

    if content_type not in tipos_permitidos:
        raise ValidationError(
            f"El tipo de archivo '{content_type}' no está permitido."
        )


def validar_archivo(archivo):
    validar_tamano_archivo(archivo)
    validar_tipo_archivo(archivo)