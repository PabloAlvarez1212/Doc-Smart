from rest_framework.throttling import ScopedRateThrottle
from medicos.models import Medico


class ActorScopedRateThrottle(ScopedRateThrottle):
    """Los IDs de Medico y Usuario pertenecen a espacios separados."""
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            tipo = "medico" if isinstance(request.user, Medico) else "usuario"
            return self.cache_format % {"scope": self.scope, "ident": f"{tipo}:{request.user.pk}"}
        return super().get_cache_key(request, view)
