from django.urls import path
from catalogos import views

urlpatterns = [
    # Rol
    path('roles/', views.RolListView.as_view(), name='rol-list'),
    path('roles/<int:id>/', views.RolDetailView.as_view(), name='rol-detail'),
    # Estado
    path('estados/', views.EstadoListView.as_view(), name='estado-list'),
    path('estados/<int:id>/', views.EstadoDetailView.as_view(), name='estado-detail'),
    # Lugar
    path('lugares/', views.LugarListView.as_view(), name='lugar-list'),
    path('lugares/<int:id>/', views.LugarDetailView.as_view(), name='lugar-detail'),
    # Medio
    path('medios/', views.MedioListView.as_view(), name='medio-list'),
    path('medios/<int:id>/', views.MedioDetailView.as_view(), name='medio-detail'),
]