from django.urls import path
from .views import LoginView, SolicitarCambioView, CambiarContraseñaView

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('solicitar-cambio/', SolicitarCambioView.as_view()),
    path('cambiar-contraseña/', CambiarContraseñaView.as_view()),
]