from rest_framework.throttling import UserRateThrottle


class HistorialUsuarioThrottle(UserRateThrottle):
    """Separa cuotas de pacientes y médicos aunque sus PK coincidan."""

    def get_cache_key(self, request, view):
        usuario = request.user
        if not usuario or not usuario.is_authenticated:
            return None

        modelo = usuario._meta.label_lower
        identidad = f'{modelo}:{usuario.pk}'
        return self.cache_format % {
            'scope': self.scope,
            'ident': identidad,
        }


class HistorialLecturaThrottle(HistorialUsuarioThrottle):
    scope = 'historial_read'


class HistorialEscrituraThrottle(HistorialUsuarioThrottle):
    scope = 'historial_write'
