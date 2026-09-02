import boto3

from botocore.client import Config
from botocore.exceptions import ClientError

from django.conf import settings
from django.db import transaction

from storage_app.models import Archivo
from storage_app.validators import validar_archivo
from storage_app.utils import construir_ruta


def obtener_cliente_s3():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(signature_version="s3v4"),
    )


def subir_archivo(
    archivo,
    categoria,
    usuario_id=None,
    referencia_id=None,
):
    validar_archivo(archivo)

    storage_key = construir_ruta(
        categoria=categoria,
        nombre_archivo=archivo.name,
        usuario_id=usuario_id,
        referencia_id=referencia_id,
    )

    cliente = obtener_cliente_s3()

    content_type = getattr(
        archivo,
        "content_type",
        "application/octet-stream",
    )

    cliente.upload_fileobj(
        archivo,
        settings.AWS_STORAGE_BUCKET_NAME,
        storage_key,
        ExtraArgs={
            "ContentType": content_type,
        },
    )

    return {
        "key": storage_key,
        "nombre": archivo.name,
        "tipo": content_type,
        "tamano": archivo.size,
    }


def generar_url_firmada(
    storage_key,
    expiracion=600,
):
    cliente = obtener_cliente_s3()

    try:
        return cliente.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                "Key": storage_key,
            },
            ExpiresIn=expiracion,
        )

    except ClientError as error:
        print(
            "Error generando URL firmada:",
            error,
        )
        return None


def eliminar_archivo(storage_key):
    cliente = obtener_cliente_s3()

    try:
        cliente.delete_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=storage_key,
        )
        return True

    except ClientError as error:
        print(
            "Error eliminando archivo:",
            error,
        )
        return False


def archivo_existe(storage_key):
    cliente = obtener_cliente_s3()

    try:
        cliente.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=storage_key,
        )
        return True

    except ClientError:
        return False


def obtener_metadata(storage_key):
    cliente = obtener_cliente_s3()

    try:
        respuesta = cliente.head_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=storage_key,
        )

        return {
            "tamano": respuesta.get("ContentLength"),
            "tipo": respuesta.get("ContentType"),
            "fecha_modificacion": respuesta.get(
                "LastModified"
            ),
        }

    except ClientError as error:
        print(
            "Error obteniendo metadata:",
            error,
        )
        return None


def probar_conexion_storage():
    cliente = obtener_cliente_s3()

    try:
        cliente.head_bucket(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME
        )
        return True

    except ClientError as error:
        print(
            "Error conectando al Object Storage:",
            error,
        )
        return False


def determinar_tipo_archivo(content_type):
    if not content_type:
        return "otro"

    if content_type.startswith("image/"):
        return "imagen"

    if content_type.startswith("video/"):
        return "video"

    if content_type.startswith("audio/"):
        return "audio"

    if content_type in {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }:
        return "documento"

    return "otro"


@transaction.atomic
def guardar_archivo_usuario(
    archivo,
    usuario_id,
    categoria="general",
    referencia_id=None,
):
    """
    Flujo:
    1. Sube archivo a Object Storage.
    2. Guarda metadatos en MySQL.
    3. Si MySQL falla, elimina el archivo del bucket.
    """

    resultado = subir_archivo(
        archivo=archivo,
        categoria=categoria,
        usuario_id=usuario_id,
        referencia_id=referencia_id,
    )

    try:
        registro = Archivo.objects.create(
            usuario_id=usuario_id,
            nombre_original=resultado["nombre"],
            storage_key=resultado["key"],
            content_type=resultado["tipo"],
            tamano=resultado["tamano"],
            tipo=determinar_tipo_archivo(
                resultado["tipo"]
            ),
            categoria=categoria,
        )

        return registro

    except Exception:
        eliminar_archivo(
            resultado["key"]
        )
        raise


@transaction.atomic
def eliminar_archivo_usuario(archivo):
    """
    Elimina el archivo físico y marca
    el registro como inactivo en MySQL.
    """

    eliminado = eliminar_archivo(
        archivo.storage_key
    )

    if not eliminado:
        return False

    archivo.activo = False

    archivo.save(
        update_fields=["activo"]
    )

    return True