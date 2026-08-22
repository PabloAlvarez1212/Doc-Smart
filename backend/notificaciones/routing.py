from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/notificaciones/(?P<tipo_usuario>paciente|medico)/(?P<user_id>\d+)/$',
        consumers.NotificacionConsumer.as_asgi()
    ),
]