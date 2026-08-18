import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chatbot.models import Chat, Mensaje
from chatbot.ai.conversation_manager import ConversationManager
import traceback
from chatbot.services import (
    ChatService,
    MensajeService,
)

from chatbot.serializers import CrearMensajeSerializer
from chatbot.services.imagen_medica_service import (
    analizar_imagen_medica,
    validar_imagen_medica,
)

from django.http import HttpResponse
from rest_framework.throttling import ScopedRateThrottle

from chatbot.ai.elevenlabs_service import (
    ElevenLabsError,
    generar_audio_bymax,
)

logger = logging.getLogger(__name__)
# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def respuesta_ok(data=None, mensaje=None, status=200):
    return Response(
        {
            "ok": True,
            "mensaje": mensaje,
            "data": data,
        },
        status=status,
    )


def respuesta_error(mensaje, errores=None, status=400):
    return Response(
        {
            "ok": False,
            "mensaje": "Error",
            "errores": errores or {"detalle": mensaje},
        },
        status=status,
    )


def respuesta_serializer_invalido(errors):
    return respuesta_error(
        "Datos inválidos",
        errores=errors,
        status=400,
    )


def normalizar_respuesta_bymax(respuesta):
    """
    Mantiene un contrato estable para el frontend.

    `respuesta` siempre es texto renderizable y `resultado` contiene los
    datos estructurados opcionales devueltos por una herramienta.
    """

    if isinstance(respuesta, dict):
        texto = respuesta.get("message")

        if not isinstance(texto, str) or not texto.strip():
            texto = "No pude generar una respuesta en este momento."

        resultado = {
            "success": respuesta.get("success", True),
            "data": respuesta.get("data", {}),
        }

        return texto, resultado

    if respuesta is None:
        return "No pude generar una respuesta en este momento.", None

    return str(respuesta), None


# ──────────────────────────────────────────────────────────────────────────────
# CHATS
# ──────────────────────────────────────────────────────────────────────────────

class ChatListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        try:

            usuario_id = request.user.id

            chats = ChatService.listar_chats(request.user)

            return respuesta_ok(data=chats)

        except Exception as e:

            print(f"Error: {e}")

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

    def post(self, request):

        try:

            usuario_id = request.user.id

            chat = ChatService.crear_chat(request.user)

            return respuesta_ok(
                data=chat,
                mensaje="Chat creado correctamente",
                status=201
            )

        except Exception as e:

            print(f"Error: {e}")

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )


class ChatDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, id_chat):

        try:

            eliminado = ChatService.eliminar_chat(
                id_chat,
                request.user
            )

            if not eliminado:

                return respuesta_error(
                    "Chat no encontrado.",
                    status=404
                )

            return respuesta_ok(
                mensaje="Chat eliminado correctamente."
            )

        except Exception as e:

            print(f"Error: {e}")

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )


# ──────────────────────────────────────────────────────────────────────────────
# MENSAJES
# ──────────────────────────────────────────────────────────────────────────────

class MensajeListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, id_chat):

        try:

            chat = ChatService.obtener_chat(
                id_chat,
                request.user
            )

            if chat is None:

                return respuesta_error(
                    "Chat no encontrado.",
                    status=404
                )

            mensajes = MensajeService.listar_mensajes(chat)

            return respuesta_ok(data=mensajes)
        except Exception as e:

            print(f"Error: {e}")

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )

    def post(self, request, id_chat):

        serializer = CrearMensajeSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return respuesta_serializer_invalido(
                serializer.errors
            )

        try:

            chat = ChatService.obtener_chat(
                id_chat,
                request.user
            )

            if chat is None:

                return respuesta_error(
                    "Chat no encontrado.",
                    status=404
                )

            mensaje = MensajeService.crear_mensaje(
                chat=chat,
                contenido=serializer.validated_data["contenido"],
                # Los clientes nunca pueden crear mensajes en nombre de Bymax.
                es_bot=False,
            )

            return respuesta_ok(
                data=mensaje,
                mensaje="Mensaje creado correctamente",
                status=201
            )

        except Exception as e:

            print(f"Error: {e}")

            return respuesta_error(
                "Error interno del servidor",
                status=500
            )


# ──────────────────────────────────────────────────────────────────────────────
# BYMAX
# ──────────────────────────────────────────────────────────────────────────────

class ChatbotResponderView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, id_chat):

        mensaje = request.data.get("mensaje")
        imagen = request.FILES.get("imagen")

        if not mensaje and not imagen:
            return respuesta_error(
                "Debe enviar un mensaje o una imagen médica.",
                status=400,
            )

        if imagen:
            error_imagen = validar_imagen_medica(imagen)
            if error_imagen:
                return respuesta_error(error_imagen, status=400)

        try:

            chat = Chat.objects.get(
                id=id_chat,
                id_usuario=request.user,
            )

        except Chat.DoesNotExist:

            return respuesta_error(
                "Chat no encontrado.",
                status=404,
            )

        try:

            # Guardar mensaje del usuario
            contenido_usuario = mensaje or "Analiza esta imagen médica."
            if imagen:
                contenido_usuario = (
                    f"{contenido_usuario}\n[Imagen adjunta: {imagen.name}]"
                )

            Mensaje.objects.create(
                id_chat=chat,
                contenido=contenido_usuario,
                es_bot=False,
                tipo="imagen" if imagen else "texto",
            )

            if chat.titulo == "Nuevo chat":
                chat.titulo = (mensaje or "Consulta con imagen")[:150]
                chat.save(update_fields=["titulo", "ultima_interaccion"])

            # Procesar conversación
            if imagen:
                respuesta = analizar_imagen_medica(imagen, mensaje or "")
            else:
                respuesta = ConversationManager.procesar(
                    chat=chat,
                    mensaje=mensaje,
                )

            texto, resultado = normalizar_respuesta_bymax(respuesta)

            Mensaje.objects.create(
                id_chat=chat,
                contenido=texto,
                es_bot=True,
                tipo="texto",
                modelo="bymax",
            )

            return respuesta_ok(
                data={
                    "respuesta": texto,
                    "resultado": resultado,
                }
            )



        except Exception as e:

            traceback.print_exc()

            return respuesta_error(
                str(e),
                status=500,
            )


# ──────────────────────────────────────────────────────────────────────────────
# VOZ DE BYMAX
# ──────────────────────────────────────────────────────────────────────────────

class BymaxVoiceView(APIView):

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "bymax_voice"

    def post(self, request):
        texto = request.data.get("texto")
        velocidad = request.data.get("velocidad", 0.96)

        if not isinstance(texto, str) or not texto.strip():
            return respuesta_error(
                "Debe enviar el texto que Bymax debe pronunciar.",
                status=400,
            )

        if len(texto.strip()) > 2500:
            return respuesta_error(
                "El texto para la voz no puede superar 2500 caracteres.",
                status=400,
            )

        try:
            velocidad = float(velocidad)
        except (TypeError, ValueError):
            return respuesta_error(
                "La velocidad de voz no tiene un formato válido.",
                status=400,
            )

        if velocidad < 0.7 or velocidad > 1.2:
            return respuesta_error(
                "La velocidad debe estar entre 0.7 y 1.2.",
                status=400,
            )

        try:
            audio = generar_audio_bymax(
                texto=texto,
                velocidad=velocidad,
            )

            response = HttpResponse(
                audio,
                content_type="audio/mpeg",
                status=200,
            )

            response["Content-Disposition"] = (
                'inline; filename="bymax-respuesta.mp3"'
            )
            response["Cache-Control"] = "private, no-store"
            response["X-Content-Type-Options"] = "nosniff"

            return response

        except ElevenLabsError as error:
            return respuesta_error(
                str(error),
                status=error.status_code,
            )

        except Exception:
            logger.exception(
                "Error inesperado generando la voz de Bymax"
            )

            return respuesta_error(
                "No fue posible generar la voz de Bymax.",
                status=500,
            )