from django.urls import path
from .views import (
    NotificacionesView,
    MarcarNotificacionLeidaView,
)

urlpatterns = [
    path(
        "",
        NotificacionesView.as_view()
    ),

    path(
        "<int:id_notificacion>/leida/",
        MarcarNotificacionLeidaView.as_view()
    ),
]