import boto3

from botocore.client import Config
from botocore.exceptions import ClientError

from django.conf import settings

from storage_app.validators import validar_archivo
import storage_app.utils


def obtener_cliente_s3():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(
            signature_version="s3v4",
        ),
    )


def subir_archivo(
    archivo,
    categoria,
    usuario_id=None,
    referencia_id=None,
):
    """
    Sube un archivo al Object Storage de Railway.

    Retorna:
    {
        "key": "...",
        "nombre": "...",
        "tipo": "...",
        "tamano": 12345
    }
    """

    validar_archivo(archivo)

    storage_key = storage_app.utils.construir_ruta(
        categoria=categoria,
        nombre_archivo=archivo.name,
        usuario_id=usuario_id,
        referencia_id=referencia_id,
    )

    cliente = obtener_cliente_s3()

    extra_args = {
        "ContentType": getattr(
            archivo,
            "content_type",
            "application/octet-stream",
        )
    }

    cliente.upload_fileobj(
        archivo,
        settings.AWS_STORAGE_BUCKET_NAME,
        storage_key,
        ExtraArgs=extra_args,
    )

    return {
        "key": storage_key,
        "nombre": archivo.name,
        "tipo": getattr(
            archivo,
            "content_type",
            None,
        ),
        "tamano": archivo.size,
    }


def generar_url_firmada(
    storage_key,
    expiracion=600,
):
    """
    Genera una URL temporal.

    expiracion=600 -> 10 minutos
    """

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

    except ClientError:
        return None


def eliminar_archivo(storage_key):
    cliente = obtener_cliente_s3()

    try:
        cliente.delete_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=storage_key,
        )

        return True

    except ClientError:
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
            "tamano": respuesta.get(
                "ContentLength"
            ),
            "tipo": respuesta.get(
                "ContentType"
            ),
            "fecha_modificacion": respuesta.get(
                "LastModified"
            ),
        }

    except ClientError:
        return None

def probar_conexion_storage():
    cliente = obtener_cliente_s3()

    try:
        cliente.head_bucket(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME
        )

        return True

    except ClientError as error:
        print("Error conectando al Object Storage:", error)
        return False