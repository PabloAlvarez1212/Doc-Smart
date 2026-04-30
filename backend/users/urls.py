from django.urls import path
from .views import (
    LoginView,
    SolicitarCambioView,
    CambiarContraseñaView,
    UsuarioListView,
    UsuarioDetailView
)

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('solicitar-cambio/', SolicitarCambioView.as_view()),
    path('cambiar-contraseña/', CambiarContraseñaView.as_view()),
    path('usuarios/', UsuarioListView.as_view()),
    path('usuarios/<int:pk>/', UsuarioDetailView.as_view()),
]