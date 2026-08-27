import os

from django.conf import settings
from django.core.asgi import get_asgi_application

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator


os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "core.settings"
)

# Inicializar Django primero
django_asgi_app = get_asgi_application()


# Importar routing después de inicializar Django
import notificaciones.routing
import chatbot.routing

from chatbot.middleware import JwtCookieAuthMiddleware


websocket_urlpatterns = (
    notificaciones.routing.websocket_urlpatterns
    + chatbot.routing.websocket_urlpatterns
)


application = ProtocolTypeRouter({
    "http": django_asgi_app,

    "websocket": OriginValidator(
        JwtCookieAuthMiddleware(
            URLRouter(
                websocket_urlpatterns
            )
        ),
        settings.WEBSOCKET_ALLOWED_ORIGINS,
    ),
})