from django.urls import path
from .views import MedicoListView, MedicoDetailView, EspecialidadListView,RegistrarMedicoView,EspecialidadDetailView

urlpatterns = [
    path('', MedicoListView.as_view(), name='medico-list'),
    path('registro/',RegistrarMedicoView.as_view(), name='medico-registro'),
    path('<int:id_medico>/', MedicoDetailView.as_view(), name='medico-detail'),
    path('especialidades/', EspecialidadListView.as_view(), name='especialidad-list'),
    path('especialidad/<int:id_especialidad>/', EspecialidadDetailView.as_view(), name='especialidad-list'),
]