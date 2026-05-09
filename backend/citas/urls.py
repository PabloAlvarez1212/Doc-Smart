from django.urls import path
from citas.views import (
    CitaListView,
    CitaPacienteView,
    CitaMedicoView,
    CitaDetailView,
    CitaCancelarView,
    CitaCompletarView,
    RecordatorioListView,
    RecordatorioDetailView,
    CitaConfirmarView
)

urlpatterns = [
    # ─── CITAS ───────────────────────────────────────────────────────────────
    path('',                        CitaListView.as_view(),      name='cita-lista'),
    path('paciente/',               CitaPacienteView.as_view(),  name='cita-paciente'),
    path('medico/',                 CitaMedicoView.as_view(),     name='cita-medico'),
    path('<int:pk>/',               CitaDetailView.as_view(),    name='cita-detalle'),
    path('<int:pk>/cancelar/',      CitaCancelarView.as_view(),  name='cita-cancelar'),
    path('<int:pk>/completar/',     CitaCompletarView.as_view(), name='cita-completar'),
    path('<int:pk>/confirmar/',     CitaConfirmarView.as_view(), name='cita-confirmar'),

    # ─── RECORDATORIOS ───────────────────────────────────────────────────────
    path('recordatorios/',          RecordatorioListView.as_view(),   name='recordatorio-lista'),
    path('recordatorios/<int:pk>/', RecordatorioDetailView.as_view(), name='recordatorio-detalle'),
]