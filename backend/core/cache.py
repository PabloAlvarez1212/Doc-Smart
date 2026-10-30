"""Caché Redis con un único pool de conexiones por proceso.

El `RedisCache` de Django guarda su cliente (y por tanto su pool) en una instancia que se crea por
contexto: en ASGI, una por cada petición. Cada una abría su propio pool, que nadie cerraba, y las
conexiones se acumulaban hasta agotar `maxclients` del servidor Redis. Aquí todas las instancias de un
mismo proceso comparten un solo cliente, con el tamaño del pool acotado por `OPTIONS`.
"""
import threading

from django.core.cache.backends.redis import RedisCache as RedisCacheDjango

_clientes = {}
_candado = threading.Lock()


class RedisCache(RedisCacheDjango):
    @property
    def _cache(self):
        clave = (tuple(self._servers), tuple(sorted((k, str(v)) for k, v in self._options.items())))
        cliente = _clientes.get(clave)
        if cliente is None:
            with _candado:
                cliente = _clientes.get(clave)
                if cliente is None:
                    cliente = _clientes[clave] = self._class(self._servers, **self._options)
        return cliente
