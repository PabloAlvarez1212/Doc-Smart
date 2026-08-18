"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Inicializar la aplicación HTTP de Django PRIMERO
django_asgi_app = get_asgi_application()

# Importar las rutas del websocket después de la inicialización de Django
import notificaciones.routing
import chatbot.routing
from chatbot.middleware import JwtCookieAuthMiddleware

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': JwtCookieAuthMiddleware(
        URLRouter(
            notificaciones.routing.websocket_urlpatterns
            + chatbot.routing.websocket_urlpatterns
        )
    ),
})
