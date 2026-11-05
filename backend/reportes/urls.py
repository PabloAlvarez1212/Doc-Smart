from django.urls import path
from .views import (
    AntecedentesReporteView,
    CrearReporteView,
    ListarReportesView,
    GestionarReporteView,
    AnularSancionView,
    MiSancionView,
    ListarUsuariosReportablesView,
    ContextoCitaReporteView,
    PrevisualizarSancionView,
    CitasReportablesView,
    EvidenciaReporteView,
)

urlpatterns = [
    path("antecedentes/<int:reporte_id>/", AntecedentesReporteView.as_view(), name="antecedentes_reporte"),
    path("previsualizar/<int:reporte_id>/", PrevisualizarSancionView.as_view(), name="previsualizar_sancion"),
    path("citas-reportables/", CitasReportablesView.as_view(), name="citas_reportables"),
    path("evidencia/<int:reporte_id>/", EvidenciaReporteView.as_view(), name="evidencia_reporte"),
    path("crear/", CrearReporteView.as_view(), name = "crear_reporte",),
    path("listar/", ListarReportesView.as_view(), name = "listar_reportes",),
    path("gestionar/<int:reporte_id>/", GestionarReporteView.as_view(), name = "gestionar_reporte",),
    path("sanciones/<int:sancion_id>/anular/", AnularSancionView.as_view(), name = "anular_sancion",),
    path("mi-sancion/", MiSancionView.as_view(), name = "mi-sancion",),
    path("usuarios-reportables/", ListarUsuariosReportablesView.as_view(), name="usuarios_reportables",),
    path("contexto-cita/<int:cita_id>/", ContextoCitaReporteView.as_view(),name="contexto_cita_reporte",),
]
