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

        if not mensaje:
            return respuesta_error(
                "Debe enviar un mensaje.",
                status=400,
            )

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
            Mensaje.objects.create(
                id_chat=chat,
                contenido=mensaje,
                es_bot=False,
                tipo="texto",
            )

            # Procesar conversación
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
