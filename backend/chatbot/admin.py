from django.contrib import admin
from chatbot.models import PermisoDiagnostico, SesionDiagnostico

admin.site.register(PermisoDiagnostico)


@admin.register(SesionDiagnostico)
class SesionDiagnosticoAdmin(admin.ModelAdmin):
    list_display = ("usuario", "creada_en", "expira_en", "cerrada_en")
    readonly_fields = ("usuario", "sesion_hash", "creada_en", "expira_en", "cerrada_en")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

