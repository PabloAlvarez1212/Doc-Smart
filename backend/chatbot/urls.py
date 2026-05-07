from django.urls import path
from .views import ChatListView, MensajeListView, ChatDetailView

urlpatterns = [
    path('chats/', ChatListView.as_view(),    name='chat-lista'),
    path('chats/<int:id_chat>/', ChatDetailView.as_view(),  name='chat-detalle'),
    path('mensajes/<int:id_chat>/', MensajeListView.as_view(), name='mensaje-lista'),
]