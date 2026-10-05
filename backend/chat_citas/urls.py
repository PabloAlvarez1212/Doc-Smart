from django.urls import path
from .views import (ConversacionesView, ConversacionView, MensajesView, LecturaView,
                    HabilitarView, AdjuntosView, AdjuntoUrlView)

urlpatterns = [
    path('conversaciones/', ConversacionesView.as_view()),
    path('conversaciones/<int:pk>/', ConversacionView.as_view()),
    path('conversaciones/<int:pk>/mensajes/', MensajesView.as_view()),
    path('conversaciones/<int:pk>/lectura/', LecturaView.as_view()),
    path('conversaciones/<int:pk>/habilitar/', HabilitarView.as_view()),
    path('conversaciones/<int:pk>/adjuntos/', AdjuntosView.as_view()),
    path('conversaciones/<int:pk>/adjuntos/<int:adjunto_id>/url/', AdjuntoUrlView.as_view()),
]
