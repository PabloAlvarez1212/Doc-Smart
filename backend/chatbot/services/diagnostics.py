"""Catálogo cerrado: jamás serializar excepciones, SQL, secretos o historias."""
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import salted_hmac
from chatbot.models import ErrorBymax, PermisoDiagnostico, SesionDiagnostico
from users.models import Usuario

CATALOGO = {
    "CITA_PERMISSION_DENIED": ("AuthorizationError", "No fue posible modificar esta cita.", False,
        "Verifica el tipo de actor y la propiedad de la cita desde el backend."),
    "CITA_CONFLICT": ("ConflictError", "La cita cambió o el horario no está disponible. Consulta la agenda e inicia de nuevo.", False,
        "Reconsulta el estado y la disponibilidad antes de iniciar otra confirmación."),
    "CITA_INVALID": ("ValidationError", "La operación no es válida para la fecha o el estado actual.", False,
        "Revisa fecha, estado y catálogos mediante los servicios autorizados."),
    "BYMAX_UNAVAILABLE": ("ServiceError", "No fue posible procesar la solicitud. Intenta nuevamente.", True,
        "Revisa disponibilidad y configuración del componente sin copiar credenciales."),
}


def error_operativo(chat, operacion, status=500):
    codigo = {403: "CITA_PERMISSION_DENIED", 404: "CITA_PERMISSION_DENIED", 409: "CITA_CONFLICT", 400: "CITA_INVALID"}.get(status, "BYMAX_UNAVAILABLE")
    tipo, mensaje, reintentable, _ = CATALOGO[codigo]
    registro = ErrorBymax.objects.create(chat=chat, codigo=codigo,
        operacion=operacion if operacion in {"reprogramar", "confirmar", "cancelar", "completar", "responder"} else "responder")
    return {"success": False, "message": mensaje, "data": {"error": {
        "error_code": codigo, "user_message": mensaje, "retryable": reintentable,
        "correlation_id": str(registro.correlacion),
    }}}


def autorizado(actor):
    return (getattr(settings, "BYMAX_DIAGNOSTICS_ENABLED", False) and isinstance(actor, Usuario)
        and actor.is_authenticated and actor.id_rol.nombre in {"admin", "developer", "desarrollador"}
        and PermisoDiagnostico.objects.filter(usuario=actor, activo=True,
            permiso__codename="view_diagnostics", permiso__content_type__app_label="chatbot").exists())


def sesion_hash(request):
    if not request.session.session_key:
        request.session.create()
    return salted_hmac("bymax-diagnostics", request.session.session_key).hexdigest()


def activar(request):
    return SesionDiagnostico.objects.create(usuario=request.user, sesion_hash=sesion_hash(request),
        expira_en=timezone.now() + timedelta(minutes=10))


def sesion_activa(request):
    return SesionDiagnostico.objects.filter(usuario=request.user, sesion_hash=sesion_hash(request),
        cerrada_en__isnull=True, expira_en__gt=timezone.now()).order_by("-creada_en").first()


def detalle(registro):
    tipo, mensaje, retryable, pasos = CATALOGO.get(registro.codigo, CATALOGO["BYMAX_UNAVAILABLE"])
    return {"codigo": registro.codigo, "tipo": tipo, "componente": "chatbot.services.cita_service" if registro.operacion != "responder" else "chatbot",
            "operacion": registro.operacion, "fecha": registro.fecha.isoformat(), "retryable": retryable,
            "correlation_id": str(registro.correlacion), "explicacion": mensaje, "pasos": pasos}
