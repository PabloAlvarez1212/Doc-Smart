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
    CitaConfirmarView,
    RegistroCitaView
)

urlpatterns = [
    # ─── CITAS ───────────────────────────────────────────────────────────────
    
    #Obtener citas
    path('',                        CitaListView.as_view(),      name='cita-lista'),
    #Crear cita
    path('registrar/',          RegistroCitaView.as_view(),      name='cita-registrar'),
    #Listar citas paciente
    path('paciente/',               CitaPacienteView.as_view(),  name='cita-paciente'),
    #Listar citas medico
    path('medico/',                 CitaMedicoView.as_view(),     name='cita-medico'),
    #Actualizar o obtener una sola cita por id
    path('<int:pk>/',               CitaDetailView.as_view(),    name='cita-detalle'),
    #Cancelar una cita por id
    path('<int:pk>/cancelar/',      CitaCancelarView.as_view(),  name='cita-cancelar'),
    #Completar una cita por id
    path('<int:pk>/completar/',     CitaCompletarView.as_view(), name='cita-completar'),
    #Confirmar una cita por id
    path('<int:pk>/confirmar/',     CitaConfirmarView.as_view(), name='cita-confirmar'),

    # ─── RECORDATORIOS ───────────────────────────────────────────────────────
    #Crear y listar recordatorio
    path('recordatorios/',          RecordatorioListView.as_view(),   name='recordatorio-lista'),
    #Actualizar,eliminar o obtener un recordatorio por id
    path('recordatorios/<int:pk>/', RecordatorioDetailView.as_view(), name='recordatorio-detalle'),
]