from django.urls import path

from storage_app.views import (
    ArchivoListaCrearView,
    ArchivoDetalleView,
    ArchivoUrlView,
)


urlpatterns = [
    path(
        "archivos/",
        ArchivoListaCrearView.as_view(),
        name="archivo-lista-crear",
    ),
    path(
        "archivos/<int:pk>/",
        ArchivoDetalleView.as_view(),
        name="archivo-detalle",
    ),
    path(
        "archivos/<int:pk>/url/",
        ArchivoUrlView.as_view(),
        name="archivo-url",
    ),
]