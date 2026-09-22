from django.conf import settings
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.utils.cache import patch_cache_control
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from chatbot.throttles import ActorScopedRateThrottle as ScopedRateThrottle
from rest_framework.authentication import SessionAuthentication
from chatbot.services import ChatService
from chatbot.services.identity_service import identidad, preguntar_animo, guardar_animo, consultar_animo
from chatbot.services import diagnostics
from chatbot.models import ErrorBymax, SesionDiagnostico
from chatbot.tools.medico_clinico import contexto_activo
from chatbot.views import respuesta_ok, respuesta_error


class IdentidadBymaxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        registro = consultar_animo(request.user)
        data = identidad(request.user)
        data["diagnostico_autorizado"] = bool(diagnostics.autorizado(request.user))
        data["animo"] = registro.puntuacion if registro else None
        data["fecha"] = registro.fecha.isoformat() if registro else None
        chat_id = request.query_params.get("chat_id")
        if chat_id:
            try:
                chat_id = int(chat_id)
            except (ValueError, TypeError):
                return respuesta_error("Chat no encontrado.", status=404)
            chat = ChatService.obtener_chat(chat_id, request.user)
            if not chat:
                return respuesta_error("Chat no encontrado.", status=404)
            data.update(chat_id=chat.pk, paciente_activo=contexto_activo(chat) if chat.id_medico_id else None)
        response = respuesta_ok(data=data)
        patch_cache_control(response, private=True, no_store=True)
        return response

    def post(self, request):
        try:
            if "puntuacion" in request.data:
                if request.data.get("confirmado") is not True:
                    return respuesta_error("Confirma la puntuación antes de guardarla.")
                registro = guardar_animo(request.user, request.data["puntuacion"])
                preguntar = False
            else:
                registro, preguntar = preguntar_animo(request.user)
            response = respuesta_ok(data={"preguntar": preguntar, "puntuacion": registro.puntuacion,
                "fecha": registro.fecha.isoformat()})
            patch_cache_control(response, private=True, no_store=True)
            return response
        except ValueError as error:
            return respuesta_error(str(error))


class DiagnosticoBymaxView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "bymax_diagnostics"

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        patch_cache_control(response, private=True, no_store=True)
        return response

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        from rest_framework.exceptions import PermissionDenied
        if not diagnostics.autorizado(request.user):
            raise PermissionDenied("Modo no disponible.")
        # También los tokens Bearer deben cumplir CSRF en este modo HTTP.
        SessionAuthentication().enforce_csrf(request)

    def get(self, request):
        sesion = diagnostics.sesion_activa(request)
        if not sesion:
            return respuesta_error("Sesión de diagnóstico inactiva.", status=403)
        # No se aceptan chat_id, actor_id ni correlaciones ajenas del cliente.
        errores = ErrorBymax.objects.filter(chat__id_usuario=request.user, chat__id_medico__isnull=True).order_by("-fecha")[:30]
        response = respuesta_ok(data={"expira_en": sesion.expira_en, "errores": [diagnostics.detalle(e) for e in errores]})
        patch_cache_control(response, private=True, no_store=True)
        return response

    def post(self, request):
        if request.data.get("confirmado") is not True:
            return respuesta_error("Confirma explícitamente la acción.")
        if request.data.get("accion") == "cerrar":
            SesionDiagnostico.objects.filter(usuario=request.user, sesion_hash=diagnostics.sesion_hash(request),
                cerrada_en__isnull=True).update(cerrada_en=timezone.now())
            return respuesta_ok(mensaje="Modo diagnóstico cerrado.")
        if request.data.get("accion") != "activar":
            return respuesta_error("Acción no válida.")
        comando = settings.BYMAX_DIAGNOSTICS_COMMAND
        if comando and not constant_time_compare(str(request.data.get("comando", "")), comando):
            return respuesta_error("Modo no disponible.", status=403)
        sesion = diagnostics.activar(request)
        return respuesta_ok(data={"expira_en": sesion.expira_en}, mensaje="Modo diagnóstico activo durante diez minutos.")
