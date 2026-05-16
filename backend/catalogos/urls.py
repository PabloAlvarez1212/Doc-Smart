from django.urls import path
from catalogos import views

urlpatterns = [
    # Rol
    path('roles/', views.RolListView.as_view(), name='rol-list'),
    path('roles/<int:id>/', views.RolDetailView.as_view(), name='rol-detail'),

    # Estado
    path('estados/', views.EstadoListView.as_view(), name='estado-list'),
    path('estados/<int:id>/', views.EstadoDetailView.as_view(), name='estado-detail'),

    # Todas las ciudades
    path('ciudades/',views.CiudadesDetailView.as_view(),name='lista-ciudades'),
    # Ciudades por departamento
    path('departamentos/<int:id_departamento>/ciudades/',views.CiudadListView.as_view(),name='ciudad-list'),
    # Ciudad específica
    path('ciudades/<int:id>/',views.CiudadDetailView.as_view(),name='ciudad-detail'),

    #Departamento
    path('departamentos/', views.DepartamentoListView.as_view(), name='departamento-list'),
    path('departamentos/<int:id>/', views.DepartamentoDetailView.as_view(), name='departamento-detail'),
    # Medio
    path('medios/', views.MedioListView.as_view(), name='medio-list'),
    path('medios/<int:id>/', views.MedioDetailView.as_view(), name='medio-detail'),
]