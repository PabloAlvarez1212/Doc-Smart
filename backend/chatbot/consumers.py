import asyncio
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db import close_old_connections

from chatbot.ai.conversation_manager import ConversationManager
from chatbot.ai.gemini_service import preguntar_gemini_stream
from chatbot.models import Chat, Mensaje


logger = logging.getLogger(__name__)


def _normalizar_respuesta(respuesta):
    if isinstance(respuesta, dict):
        texto = respuesta.get("message")
        if not isinstance(texto, str) or not texto.strip():
            texto = "No pude generar una respuesta en este momento."
        return texto, {
            "success": respuesta.get("success", True),
            "data": respuesta.get("data", {}),
            "requires_confirmation": respuesta.get(
                "requires_confirmation", False
            ),
            "requires_selection": respuesta.get("requires_selection", False),
        }

    if respuesta is None:
        return "No pude generar una respuesta en este momento.", None

    return str(respuesta), None


class BymaxConsumer(AsyncJsonWebsocketConsumer):
    """Transmite el texto de Bymax progresivamente por WebSocket."""

    async def connect(self):
        self.id_chat = int(self.scope["url_route"]["kwargs"]["id_chat"])
        self.tarea_respuesta = None
        usuario = self.scope.get("user")

        if not usuario or not usuario.is_authenticated:
            await self.close(code=4401)
            return

        self.chat = await self._obtener_chat(usuario.id)
        if self.chat is None:
            await self.close(code=4404)
            return

        await self.accept()
        await self.send_json({"tipo": "conectado", "id_chat": self.id_chat})

    async def disconnect(self, close_code):
        if self.tarea_respuesta and not self.tarea_respuesta.done():
            self.tarea_respuesta.cancel()

    async def receive_json(self, content, **kwargs):
        tipo = content.get("tipo", "mensaje")

        if tipo == "cancelar":
            if self.tarea_respuesta and not self.tarea_respuesta.done():
                self.tarea_respuesta.cancel()
            return

        mensaje = str(content.get("mensaje") or "").strip()
        if not mensaje:
            await self.send_json({
                "tipo": "error",
                "mensaje": "Debes escribir un mensaje.",
            })
            return

        if len(mensaje) > 10000:
            await self.send_json({
                "tipo": "error",
                "mensaje": "El mensaje es demasiado largo.",
            })
            return

        if self.tarea_respuesta and not self.tarea_respuesta.done():
            await self.send_json({
                "tipo": "error",
                "mensaje": "Bymax todavía está respondiendo.",
            })
            return

        self.tarea_respuesta = asyncio.create_task(self._responder(mensaje))

    async def _responder(self, mensaje):
        respuesta_completa = ""
        try:
            await self._guardar_mensaje_usuario(mensaje)
            await self.send_json({"tipo": "inicio"})

            resultado = await database_sync_to_async(
                ConversationManager.procesar,
                thread_sensitive=True,
            )(self.chat, mensaje, streaming=True)

            if isinstance(resultado, dict) and resultado.get("stream"):
                respuesta_completa = await self._transmitir_gemini(
                    resultado.get("contents", [])
                )
                resultado_estructurado = None
            else:
                respuesta_completa, resultado_estructurado = (
                    _normalizar_respuesta(resultado)
                )
                await self.send_json({
                    "tipo": "texto",
                    "contenido": respuesta_completa,
                })

            if not respuesta_completa.strip():
                raise RuntimeError("Bymax generó una respuesta vacía")

            await self._guardar_mensaje_bymax(respuesta_completa)
            await self.send_json({
                "tipo": "fin",
                "respuesta": respuesta_completa,
                "resultado": resultado_estructurado,
            })

        except asyncio.CancelledError:
            await self.send_json({"tipo": "cancelado"})
            raise
        except Exception:
            logger.exception("Error transmitiendo la respuesta de Bymax")
            await self.send_json({
                "tipo": "error",
                "mensaje": (
                    "En este momento no puedo procesar tu solicitud. "
                    "Por favor, intenta nuevamente en unos segundos."
                ),
            })

    async def _transmitir_gemini(self, contents):
        cola = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def producir():
            close_old_connections()
            try:
                for fragmento in preguntar_gemini_stream(contents):
                    loop.call_soon_threadsafe(
                        cola.put_nowait, ("texto", fragmento)
                    )
            except Exception as error:
                loop.call_soon_threadsafe(cola.put_nowait, ("error", error))
            finally:
                close_old_connections()
                loop.call_soon_threadsafe(cola.put_nowait, ("fin", None))

        tarea_productora = asyncio.create_task(asyncio.to_thread(producir))
        partes = []

        try:
            while True:
                tipo, valor = await cola.get()
                if tipo == "texto":
                    partes.append(valor)
                    await self.send_json({"tipo": "texto", "contenido": valor})
                elif tipo == "error":
                    raise valor
                else:
                    break
        finally:
            await tarea_productora

        return "".join(partes).strip()

    @database_sync_to_async
    def _obtener_chat(self, usuario_id):
        return Chat.objects.filter(
            id=self.id_chat,
            id_usuario_id=usuario_id,
            estado="activo",
        ).first()

    @database_sync_to_async
    def _guardar_mensaje_usuario(self, mensaje):
        Mensaje.objects.create(
            id_chat=self.chat,
            contenido=mensaje,
            es_bot=False,
            tipo="texto",
        )

        if self.chat.titulo == "Nuevo chat":
            self.chat.titulo = mensaje[:150]
            self.chat.save(update_fields=["titulo", "ultima_interaccion"])

    @database_sync_to_async
    def _guardar_mensaje_bymax(self, respuesta):
        Mensaje.objects.create(
            id_chat=self.chat,
            contenido=respuesta,
            es_bot=True,
            tipo="texto",
            modelo="bymax",
        )
