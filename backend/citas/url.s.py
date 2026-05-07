from django.urls import path
from .views import CitaListView, CitaDetailView, RecordatorioListView, RecordatorioDetailView

urlpatterns = [
    path('citas/', CitaListView.as_view(), name='cita-list'),
    path('citas/<int:pk>/', CitaDetailView.as_view(), name='cita-detail'),
    path('recordatorios/', RecordatorioListView.as_view(), name='recordatorio-list'),
    path('recordatorios/<int:pk>/', RecordatorioDetailView.as_view(), name='recordatorio-detail'),
]