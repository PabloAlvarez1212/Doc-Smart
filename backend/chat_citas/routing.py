from django.urls import path
from .consumers import ChatCitasConsumer

websocket_urlpatterns = [
    path('ws/chat-citas/<int:conversacion_id>/', ChatCitasConsumer.as_asgi()),
]
