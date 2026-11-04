from django.urls import path
from .views import (
    CrearReporteView,
    ListarReportesView,
    GestionarReporteView,
    AnularSancionView,
    MiSancionView,
    ListarUsuariosReportablesView,
    ContextoCitaReporteView,
)

urlpatterns = [
    path("crear/", CrearReporteView.as_view(), name = "crear_reporte",),
    path("listar/", ListarReportesView.as_view(), name = "listar_reportes",),
    path("gestionar/<int:reporte_id>/", GestionarReporteView.as_view(), name = "gestionar_reporte",),
    path("sanciones/<int:sancion_id>/anular/", AnularSancionView.as_view(), name = "anular_sancion",),
    path("mi-sancion/", MiSancionView.as_view(), name = "mi-sancion",),
    path("usuarios-reportables/", ListarUsuariosReportablesView.as_view(), name="usuarios_reportables",),
    path("contexto-cita/<int:cita_id>/", ContextoCitaReporteView.as_view(),name="contexto_cita_reporte",),
]