from django.urls import path
from .views import ChatListView, MensajeListView, ChatDetailView

urlpatterns = [
    path('chats/<int:id_usuario>/', ChatListView.as_view()),
    path('chats/eliminar/<int:id_chat>/', ChatDetailView.as_view()),
    path('mensajes/<int:id_chat>/', MensajeListView.as_view()),
]