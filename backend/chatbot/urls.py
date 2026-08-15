from django.urls import path
from .views import ChatListView, MensajeListView, ChatDetailView
from .views import ChatListView, MensajeListView, ChatDetailView, ChatbotResponderView



urlpatterns = [
    path('chats/', ChatListView.as_view(),    name='chat-lista'),
    path('chats/<int:id_chat>/', ChatDetailView.as_view(),  name='chat-detalle'),
    path('mensajes/<int:id_chat>/', MensajeListView.as_view(), name='mensaje-lista'),
    path('chats/<int:id_chat>/responder/', ChatbotResponderView.as_view(), name='chatbot-responder'),

]