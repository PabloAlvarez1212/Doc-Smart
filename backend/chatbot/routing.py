from django.urls import re_path

from chatbot.consumers import BymaxConsumer


websocket_urlpatterns = [
    re_path(
        r"^ws/chatbot/(?P<id_chat>\d+)/$",
        BymaxConsumer.as_asgi(),
    ),
]
