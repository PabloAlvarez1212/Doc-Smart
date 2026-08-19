from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.http import parse_cookie

from utils import CustomJWTAuthentication


@database_sync_to_async
def _usuario_desde_token(token):
    autenticacion = CustomJWTAuthentication()
    token_validado = autenticacion.get_validated_token(token)
    return autenticacion.get_user(token_validado)


class JwtCookieAuthMiddleware:
    """Autentica WebSockets usando la misma cookie JWT que la API REST."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope["user"] = AnonymousUser()

        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode("latin1")
        token = parse_cookie(cookie_header).get("token")

        if token:
            try:
                scope["user"] = await _usuario_desde_token(token)
            except Exception:
                # El consumer rechazará la conexión con 4401.
                scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
