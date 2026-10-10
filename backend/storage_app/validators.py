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


def validar_archivo_chat(archivo):
    """Formatos limitados de chat; conserva el cursor de la transferencia."""
    from pathlib import Path
    import warnings
    from PIL import Image, UnidentifiedImageError
    mime = getattr(archivo, 'content_type', '')
    formats = {'image/jpeg': ('JPEG', {'.jpg', '.jpeg'}),
               'image/png': ('PNG', {'.png'}), 'image/webp': ('WEBP', {'.webp'}),
               'application/pdf': ('PDF', {'.pdf'})}
    validar_tipo_archivo(archivo, set(formats))
    validar_tamano_archivo(archivo, (10 if mime == 'application/pdf' else 8) * 1024 * 1024)
    expected, extensions = formats[mime]
    if Path(archivo.name).suffix.lower() not in extensions:
        raise ValidationError('La extensión no coincide con el tipo')
    position = archivo.tell()
    try:
        archivo.seek(0)
        if expected == 'PDF':
            if not archivo.read(5) == b'%PDF-':
                raise ValidationError('PDF inválido')
        else:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(archivo) as image:
                    if image.format != expected:
                        raise ValidationError('Formato de imagen incoherente')
                    image.verify()
                # JPEG verify() no decodifica los píxeles: detectar datos truncados.
                archivo.seek(0)
                with Image.open(archivo) as image:
                    image.load()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError,
            Image.DecompressionBombWarning):
        raise ValidationError('Imagen inválida o demasiado grande')
    finally:
        archivo.seek(position)


def validar_archivo_seguimiento(archivo):
    """Reutiliza límites y validación real de imagen/PDF; restringe Word por contenido."""
    from pathlib import Path
    from zipfile import ZipFile, BadZipFile
    from xml.etree import ElementTree
    mime = getattr(archivo, 'content_type', '')
    word = {'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'}
    if mime not in word:
        return validar_archivo_chat(archivo)
    validar_tipo_archivo(archivo, set(word))
    validar_tamano_archivo(archivo, 10 * 1024 * 1024)
    if archivo.size == 0 or Path(archivo.name).suffix.lower() != word[mime]:
        raise ValidationError('Documento Word vacío o extensión incoherente')
    position = archivo.tell()
    try:
        archivo.seek(0)
        if word[mime] == '.doc':
            contents = archivo.read()
            if not contents.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1') or 'WordDocument'.encode('utf-16le') not in contents:
                raise ValidationError('Documento DOC inválido')
        else:
            with ZipFile(archivo) as archive:
                if not {'[Content_Types].xml', 'word/document.xml'} <= set(archive.namelist()):
                    raise ValidationError('Documento DOCX inválido')
                if any(info.flag_bits & 1 for info in archive.infolist()) or sum(info.file_size for info in archive.infolist()) > 50 * 1024 * 1024:
                    raise ValidationError('DOCX cifrado o demasiado grande')
                if archive.getinfo('word/document.xml').file_size > 10 * 1024 * 1024:
                    raise ValidationError('Contenido DOCX demasiado grande')
                root = ElementTree.fromstring(archive.read('word/document.xml'))
                if root.tag != '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document':
                    raise ValidationError('Contenido DOCX inválido')
    except (BadZipFile, OSError, ValueError, ElementTree.ParseError) as exc:
        raise ValidationError('Documento Word inválido') from exc
    finally:
        archivo.seek(position)
