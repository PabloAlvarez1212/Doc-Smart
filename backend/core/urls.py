"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from .public_views import PublicMetricsView, SessionSummaryView
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('api/public/metrics/', PublicMetricsView.as_view(), name='public-metrics'),
    path('api/session-summary/', SessionSummaryView.as_view(), name='session-summary'),
    path('api/chat-citas/', include('chat_citas.urls')),
    path('admin/',          admin.site.urls),
    path('api/',            include('users.urls')),
    path('api/chatbot/',    include('chatbot.urls')),
    path('api/medicos/',    include('medicos.urls')),
    path('api/catalogos/',  include('catalogos.urls')),
    path('api/citas/',      include('citas.urls')),
    path('api/historial/',  include('historial_medico.urls')),
    path('api/notificaciones/', include('notificaciones.urls')),
    path("api/storage/",include("storage_app.urls"),
),
]
