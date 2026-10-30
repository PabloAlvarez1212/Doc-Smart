"""Respuesta controlada cuando Redis no está disponible.

Los límites de intentos (throttling) viven en Redis. Si no se puede consultar, la petición se rechaza con
503: nunca se omite el límite ni se da por aprobada una verificación. No se muestran detalles de la conexión.
"""
import logging

from redis.exceptions import RedisError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

REINTENTO_SEGUNDOS = 5


def manejador_excepciones(exc, contexto):
    if isinstance(exc, RedisError):
        vista = contexto.get("view").__class__.__name__ if contexto.get("view") else "desconocida"
        logger.error("Redis no disponible en %s (%s)", vista, type(exc).__name__)
        respuesta = Response(
            {
                "ok": False,
                "mensaje": "Error",
                "errores": {"general": ["El servicio no está disponible por el momento. Inténtalo de nuevo en unos segundos."]},
            },
            status=503,
        )
        respuesta["Retry-After"] = str(REINTENTO_SEGUNDOS)
        return respuesta
    return exception_handler(exc, contexto)
