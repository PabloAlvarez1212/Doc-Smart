from django.urls import path
from .views import (
    MedicoListView,
    MedicoDetailView,
    EspecialidadListView,
    RegistrarMedicoView,
    EspecialidadDetailView,
    DashboardInicioMedicoView,
    PerfilMedicoView,
    FotoPerfilMedicoView,
)
urlpatterns = [
    path('', MedicoListView.as_view(), name='medico-list'),
    path('registro/',RegistrarMedicoView.as_view(), name='medico-registro'),
    path('<int:id_medico>/', MedicoDetailView.as_view(), name='medico-detail'),
    path('especialidades/', EspecialidadListView.as_view(), name='especialidad-list'),
    path('especialidad/<int:id_especialidad>/', EspecialidadDetailView.as_view(), name='especialidad-list'),
    path("dashboard/inicio/",DashboardInicioMedicoView.as_view(),name="dashboard-medico"),
    path('perfil/', PerfilMedicoView.as_view(), name='perfil-medico'),
    path('perfil/foto/', FotoPerfilMedicoView.as_view(), name='foto-perfil-medico'),
]