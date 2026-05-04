from django.urls import path
from .views import MedicoListView, MedicoDetailView, EspecialidadListView

urlpatterns = [
    path('', MedicoListView.as_view(), name='medico-list'),
    path('<int:id_medico>/', MedicoDetailView.as_view(), name='medico-detail'),
    path('especialidades/', EspecialidadListView.as_view(), name='especialidad-list'),
]