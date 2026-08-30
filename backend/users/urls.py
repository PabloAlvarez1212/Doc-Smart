from django.urls import path
from .views import (
    LoginView,
    SolicitarCambioView,
    CambiarContraseñaView,
    UsuarioListView,
    UsuarioDetailView,
    RegistroView,
    PerfilPacienteView,
    LogoutView,
    DashboardInicioPacienteView,
    FotoPerfilPacienteView,
    RefreshTokenView,
    CSRFTokenView,
)

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('solicitar-cambio/', SolicitarCambioView.as_view()),
    path('cambiar-contraseña/', CambiarContraseñaView.as_view()),
    path('usuarios/', UsuarioListView.as_view()),
    path('usuarios/registro/',RegistroView.as_view()),
    path('usuarios/<int:pk>/', UsuarioDetailView.as_view()),
    path('perfil/',PerfilPacienteView.as_view()),
    path('logout/', LogoutView.as_view()),
    path('dashboard/inicio/paciente/',DashboardInicioPacienteView.as_view()),
    path("perfil/foto/",FotoPerfilPacienteView.as_view(),name="foto-perfil-paciente"),
    path("refresh/",RefreshTokenView.as_view(),name="refresh-token"),
    path("csrf/",CSRFTokenView.as_view(),name="csrf-token"),
]