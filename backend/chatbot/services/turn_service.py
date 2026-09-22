import hashlib
import uuid
import json
from django.core.serializers.json import DjangoJSONEncoder
from chatbot.models import TurnoBymax


def json_seguro(valor):
    """Mismo contrato JSON para fechas/decimales de herramientas y su caché."""
    return json.loads(json.dumps(valor, cls=DjangoJSONEncoder))


def iniciar_turno(chat, clave, mensaje, archivo=None):
    clave = uuid.UUID(str(clave)) if clave else uuid.uuid4()
    resumen = hashlib.sha256(str(mensaje).encode())
    if archivo is not None:
        posicion = archivo.tell()
        try:
            archivo.seek(0)
            resumen.update(b"\0imagen\0")
            resumen.update(archivo.name.encode())
            for bloque in archivo.chunks():
                resumen.update(bloque)
        finally:
            archivo.seek(posicion)
    huella = resumen.hexdigest()
    turno, nuevo = TurnoBymax.objects.get_or_create(chat=chat, clave=clave, defaults={"huella": huella})
    if turno.huella != huella:
        raise ValueError("El identificador ya corresponde a otro mensaje.")
    return turno, nuevo


def completar_turno(turno, respuesta):
    turno.estado = "completado"
    turno.respuesta = json_seguro(respuesta)
    turno.save(update_fields=["estado", "respuesta"])
