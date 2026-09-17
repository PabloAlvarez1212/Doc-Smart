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
    MedicosDisponiblesView,
    ListarSolicitudesValidacionView,
    MetricasValidacionMedicosView,
    HojaVidaSolicitudValidacionView,
    AprobarSolicitudValidacionView,
    RechazarSolicitudValidacionView,
    MiValidacionMedicoView,
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
    #!Listar medicos disponibles
    path('disponibles/',MedicosDisponiblesView.as_view(),name="medicos-disponibles"),
    #!Listar medicos con estado pendiente y rechazados.
    path("solicitudes-validacion/",ListarSolicitudesValidacionView.as_view(),name="listar-solicitudes-validacion"),
    #!Listar numero de medicos por estado
    path("solicitudes-validacion/metricas/",MetricasValidacionMedicosView.as_view(),name="metricas-validacion-medicos"),
    #!Genera url de la hoja de vida
    path("solicitudes-validacion/<int:solicitud_id>/hoja-vida/",HojaVidaSolicitudValidacionView.as_view(),name="hoja-vida-solicitud-validacion"),
    #!Aprueba medicos
    path("solicitudes-validacion/<int:solicitud_id>/aprobar/",AprobarSolicitudValidacionView.as_view(),name="aprobar-solicitud-validacion"),
    #!Rechazar medicos
    path("solicitudes-validacion/<int:solicitud_id>/rechazar/",RechazarSolicitudValidacionView.as_view(),name="rechazar-solicitud-validacion"),
    #!Obtiene datos sobre la revision del medico
    path("mi-validacion/",MiValidacionMedicoView.as_view(),name="mi-validacion-medico"),
]