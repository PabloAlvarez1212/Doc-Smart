from django.urls import path

from .views import (
    NotificacionesView,
    DestinoNotificacionView,
    MarcarNotificacionLeidaView,
    MarcarTodasNotificacionesLeidasView,
    EliminarNotificacionView,
    EliminarTodasNotificacionesView,
)

urlpatterns = [
    path("<int:id_notificacion>/destino/", DestinoNotificacionView.as_view()),

    path(
        "",
        NotificacionesView.as_view()
    ),

    path(
        "<int:id_notificacion>/leida/",
        MarcarNotificacionLeidaView.as_view()
    ),

    path(
        "leida/todas/",
        MarcarTodasNotificacionesLeidasView.as_view()
    ),

    path(
        "<int:id_notificacion>/eliminar/",
        EliminarNotificacionView.as_view()
    ),

    path(
        "eliminar/todas/",
        EliminarTodasNotificacionesView.as_view()
    ),
]