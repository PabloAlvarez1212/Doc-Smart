from django.urls import path

from chatbot.views import (
    BymaxVoiceView,
    ChatbotResponderView,
    ChatDetailView,
    ChatListView,
    MensajeListView,
)


urlpatterns = [
    path(
        "chats/",
        ChatListView.as_view(),
        name="chat-lista",
    ),
    path(
        "chats/<int:id_chat>/",
        ChatDetailView.as_view(),
        name="chat-detalle",
    ),
    path(
        "mensajes/<int:id_chat>/",
        MensajeListView.as_view(),
        name="mensaje-lista",
    ),
    path(
        "chats/<int:id_chat>/responder/",
        ChatbotResponderView.as_view(),
        name="chatbot-responder",
    ),
    path(
        "voz/",
        BymaxVoiceView.as_view(),
        name="bymax-voz",
    ),
]