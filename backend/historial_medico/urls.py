from django.urls import path
from historial_medico.views import (
    HistorialListView,
    HistorialPacienteView,
    HistorialMedicoView,
    HistorialDetailView
)

urlpatterns = [
    # Médico crea un historial
    path('', HistorialListView.as_view(), name='historial-crear'),

    # Paciente lista sus historiales
    path('paciente/', HistorialPacienteView.as_view(), name='historial-paciente'),

    # Médico lista los historiales que él creó
    path('medico/', HistorialMedicoView.as_view(), name='historial-medico'),

    # Obtener o editar un historial específico
    path('<int:historial_id>/', HistorialDetailView.as_view(), name='historial-detalle'),
]