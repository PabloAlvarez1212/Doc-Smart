from django.urls import path
from citas.views import (
    CitaDocumentosView,
    CitaDocumentoUrlView,
    CitaInasistenciaView,
    CitaListView,
    CitaPacienteView,
    CitaMedicoView,
    CitaMedicoResumenView,
    CitaDetailView,
    CitaCancelarView,
    CitaCompletarView,
    RecordatorioListView,
    RecordatorioDetailView,
    CitaConfirmarView,
    RegistroCitaView,
    EstadisticasCitasView
)

urlpatterns = [
    path('<int:pk>/documentos/', CitaDocumentosView.as_view(), name='cita-documentos'),
    path('<int:pk>/documentos/<int:documento_id>/url/', CitaDocumentoUrlView.as_view(), name='cita-documento-url'),
    path('<int:pk>/inasistencia/', CitaInasistenciaView.as_view(), name='cita-inasistencia'),
    # ─── CITAS ───────────────────────────────────────────────────────────────

    #Obtener citas
    path('',                        CitaListView.as_view(),      name='cita-lista'),
    #Crear cita
    path('registrar/',          RegistroCitaView.as_view(),      name='cita-registrar'),
    #Listar citas paciente
    path('paciente/',               CitaPacienteView.as_view(),  name='cita-paciente'),
    #Listar citas medico
    path('medico/',                 CitaMedicoView.as_view(),     name='cita-medico'),
    #Listar resumen de las citas del medico
    path('medico/resumen/', CitaMedicoResumenView.as_view(), name='cita-medico-resumen'),
    #Actualizar o obtener una sola cita por id
    path('<int:pk>/',               CitaDetailView.as_view(),    name='cita-detalle'),
    #Cancelar una cita por id
    path('<int:pk>/cancelar/',      CitaCancelarView.as_view(),  name='cita-cancelar'),
    #Completar una cita por id
    path('<int:pk>/completar/',     CitaCompletarView.as_view(), name='cita-completar'),
    #Confirmar una cita por id
    path('<int:pk>/confirmar/',     CitaConfirmarView.as_view(), name='cita-confirmar'),

    # ─── RECORDATORIOS ───────────────────────────────────────────────────────
    # Crear y listar recordatorio
    path('recordatorios/', RecordatorioListView.as_view(), name='recordatorio-lista'),
    # Actualizar, eliminar o obtener un recordatorio por id
    path('recordatorios/<int:pk>/', RecordatorioDetailView.as_view(),name='recordatorio-detalle'),
    # Estadísticas Dashboard
    path("admin/dashboard/", EstadisticasCitasView.as_view(),name="estadisticas-citas"),
]
