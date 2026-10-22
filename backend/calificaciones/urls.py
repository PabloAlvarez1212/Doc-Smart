from django.urls import path

from calificaciones.views import (
    CrearCalificacionView,
    ActualizarCalificacionView,
    ListarCalificacionesMedicoView,
    ObtenerPromedioCalificacionesMedicoView,
    ActualizarVisibilidadCalificacionView,
    ListarMisCalificacionesMedicoView
)

urlpatterns = [
    
    path("crear/",CrearCalificacionView.as_view(),name="crear_calificacion"),
    path("actualizar/<int:id_calificacion>/",ActualizarCalificacionView.as_view(),name="actualizar_calificacion"),
    path("medico/<int:id_medico>/",ListarCalificacionesMedicoView.as_view(),name="listar_calificaciones_medico"),
    path("medico/<int:id_medico>/promedio/",ObtenerPromedioCalificacionesMedicoView.as_view(),name="obtener_promedio_calificaciones_medico"),
    path("visibilidad/<int:id_calificacion>/",ActualizarVisibilidadCalificacionView.as_view(),name="actualizar_visibilidad_calificacion"),
    path("medico/mis-calificaciones/",ListarMisCalificacionesMedicoView.as_view(),name="listar_mis_calificaciones_medico"),
]