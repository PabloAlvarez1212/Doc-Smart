import hashlib
import hmac
import math
from functools import lru_cache

from django.conf import settings
from django.core.cache import cache
from redis import Redis


MAX_INTENTOS = 5
TIEMPO_BLOQUEO = 15 * 60


@lru_cache(maxsize=1)
def obtenerRedis():
    """
    Reutiliza la conexión con Redis configurada
    en las variables de entorno de Django.
    """

    redis_url = getattr(settings, "REDIS_URL", None)

    if not redis_url:
        return None

    return Redis.from_url(
        redis_url,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )


def obtenerClaves(correo):
    """
    Genera identificadores seguros para almacenar
    los intentos sin exponer el correo en Redis.
    """

    correo = correo.strip().lower()

    identificador = hmac.new(
        settings.SECRET_KEY.encode(),
        correo.encode(),
        hashlib.sha256
    ).hexdigest()

    return (
        f"login:intentos:{identificador}",
        f"login:bloqueo:{identificador}"
    )


def verificarBloqueo(correo):
    """
    Devuelve los segundos restantes de bloqueo.
    Si no existe bloqueo, devuelve 0.
    """

    _, clave_bloqueo = obtenerClaves(correo)

    redis = obtenerRedis()

    if redis:
        segundos = redis.ttl(clave_bloqueo)
        return max(0, segundos)

    if not settings.DEBUG:
        raise RuntimeError(
            "Redis es obligatorio para limitar intentos en producción."
        )

    bloqueado = cache.get(clave_bloqueo)

    if not bloqueado:
        return 0

    return max(0, math.ceil(bloqueado))


def registrarIntentoFallido(correo):
    """
    Registra el intento fallido y bloquea temporalmente
    cuando se alcanza el límite.
    """

    clave_intentos, clave_bloqueo = obtenerClaves(correo)

    redis = obtenerRedis()

    if redis:
        script = """
        local bloqueo = redis.call('TTL', KEYS[2])

        if bloqueo > 0 then
            return {0, bloqueo}
        end

        local intentos = redis.call('INCR', KEYS[1])

        if intentos == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
        end

        if intentos >= tonumber(ARGV[2]) then
            redis.call('SET', KEYS[2], '1', 'EX', ARGV[1])
            redis.call('DEL', KEYS[1])

            return {0, tonumber(ARGV[1])}
        end

        return {tonumber(ARGV[2]) - intentos, 0}
        """

        restantes, bloqueo = redis.eval(
            script,
            2,
            clave_intentos,
            clave_bloqueo,
            TIEMPO_BLOQUEO,
            MAX_INTENTOS,
        )

        return {
            "intentos_restantes": restantes,
            "segundos_restantes": bloqueo,
            "bloqueado": bloqueo > 0,
        }

    if not settings.DEBUG:
        raise RuntimeError(
            "Redis es obligatorio para limitar intentos en producción."
        )

    # Alternativa para desarrollo local sin Redis.
    cache.add(
        clave_intentos,
        0,
        timeout=TIEMPO_BLOQUEO,
    )

    intentos = cache.incr(clave_intentos)

    if intentos >= MAX_INTENTOS:
        cache.set(
            clave_bloqueo,
            TIEMPO_BLOQUEO,
            timeout=TIEMPO_BLOQUEO,
        )

        cache.delete(clave_intentos)

        return {
            "intentos_restantes": 0,
            "segundos_restantes": TIEMPO_BLOQUEO,
            "bloqueado": True,
        }

    return {
        "intentos_restantes": MAX_INTENTOS - intentos,
        "segundos_restantes": 0,
        "bloqueado": False,
    }


def reiniciarIntentos(correo):
    """
    Elimina los intentos registrados después
    de un inicio de sesión exitoso.
    """

    clave_intentos, clave_bloqueo = obtenerClaves(correo)

    redis = obtenerRedis()

    if redis:
        redis.delete(
            clave_intentos,
            clave_bloqueo,
        )
        return

    if not settings.DEBUG:
        raise RuntimeError(
            "Redis es obligatorio para limitar intentos en producción."
        )

    cache.delete_many([
        clave_intentos,
        clave_bloqueo,
    ])