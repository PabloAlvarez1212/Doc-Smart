import asyncio
import logging
from types import SimpleNamespace
from chatbot.throttles import ActorScopedRateThrottle

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db import close_old_connections
from django.db import transaction
from chatbot.services.turn_service import iniciar_turno, completar_turno, json_seguro
from chatbot.services.diagnostics import error_operativo

from chatbot.ai.conversation_manager import ConversationManager
from chatbot.ai.gemini_service import preguntar_gemini_stream
from chatbot.models import Chat, Mensaje
from chatbot.services.chat_service import ChatService
from chatbot.ai.doctor_conversation import DOCTOR_SYSTEM_PROMPT
from medicos.models import Medico


logger = logging.getLogger(__name__)


def _normalizar_respuesta(respuesta):
    if isinstance(respuesta, dict):
        texto = respuesta.get("message")
        if not isinstance(texto, str) or not texto.strip():
            texto = "No pude generar una respuesta en este momento."
        return texto, json_seguro({
            "success": respuesta.get("success", True),
            "data": respuesta.get("data", {}),
            "requires_confirmation": respuesta.get(
                "requires_confirmation", False
            ),
            "requires_selection": respuesta.get("requires_selection", False),
        })

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

        if (
            isinstance(usuario, Medico)
            and not await self._medico_aprobado(usuario)
        ):
            await self.close(code=4403)
            return

        self.chat = await self._obtener_chat(usuario)
        if self.chat is None:
            await self.close(code=4404)
            return

        await self.accept()
        await self.send_json({"tipo": "conectado", "id_chat": self.id_chat})

    async def disconnect(self, close_code):
        # Una desconexión no revierte una operación ya confirmada. Se termina
        # y persiste su resultado para recuperar el mismo turno al reconectar.
        self.desconectado = True

    async def send_json(self, content, close=False):
        if not getattr(self, "desconectado", False):
            await super().send_json(content, close=close)

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict) or not isinstance(content.get("mensaje", ""), str):
            await self.send_json({"tipo": "error", "mensaje": "Envía un mensaje de texto válido."})
            return
        if "bymax_token" in self.scope:
            from chatbot.middleware import _usuario_desde_token
            try:
                self.scope["user"] = await _usuario_desde_token(self.scope["bymax_token"])
            except Exception:
                await self.close(code=4401)
                return
        tipo = content.get("tipo", "mensaje")

        if tipo == "cancelar":
            await self.send_json({"tipo": "aviso", "mensaje": "La solicitud en curso conservará su resultado en el historial."})
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

        permitido = await database_sync_to_async(ActorScopedRateThrottle().allow_request)(
            SimpleNamespace(user=self.scope["user"]), SimpleNamespace(throttle_scope="bymax_chat"))
        if not permitido:
            await self.send_json({"tipo": "error", "mensaje": "Has alcanzado el límite temporal. Espera antes de enviar otra solicitud."})
            return
        self.tarea_respuesta = asyncio.create_task(self._responder(mensaje, content.get("request_id")))

    async def _responder(self, mensaje, request_id=None):
        respuesta_completa = ""
        turno = None
        try:
            self.chat = await self._obtener_chat(self.scope["user"])
            if self.chat is None:
                await self.close(code=4404)
                return
            turno, nuevo = await database_sync_to_async(iniciar_turno)(self.chat, request_id, mensaje)
            if not nuevo:
                if turno.estado == "completado":
                    await self.send_json({"tipo": "fin", **turno.respuesta})
                else:
                    await self.send_json({"tipo": "error", "mensaje": "Este mensaje ya está siendo procesado. Consulta el historial."})
                return
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

            await self._guardar_mensaje_bymax(respuesta_completa, turno, resultado_estructurado)
            await self.send_json({
                "tipo": "fin",
                "respuesta": respuesta_completa,
                "resultado": resultado_estructurado,
            })

        except asyncio.CancelledError:
            await self.send_json({"tipo": "cancelado"})
            raise
        except Exception as error:
            logger.error(
                "Error transmitiendo la respuesta de Bymax tipo=%s chat_id=%s",
                type(error).__name__,
                self.id_chat,
            )
            if turno is not None and turno.estado != "completado":
                seguro = await database_sync_to_async(error_operativo)(self.chat, "responder")
                texto, resultado = _normalizar_respuesta(seguro)
                await self._guardar_mensaje_bymax(texto, turno, resultado)
                await self.send_json({"tipo": "fin", **turno.respuesta})
            else:
                await self.send_json({"tipo": "error", "mensaje": "No fue posible procesar el mensaje."})

    async def _transmitir_gemini(self, contents):
        cola = asyncio.Queue()
        loop = asyncio.get_running_loop()

        def producir():
            close_old_connections()
            try:
                opciones = {"system_prompt": DOCTOR_SYSTEM_PROMPT} if self.chat.id_medico_id else {}
                for fragmento in preguntar_gemini_stream(contents, **opciones):
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
    def _obtener_chat(self, usuario):
        return ChatService.obtener_chat(self.id_chat, usuario)

    @database_sync_to_async
    def _medico_aprobado(self, medico):
        return medico.esta_aprobado

    @database_sync_to_async
    @transaction.atomic
    def _guardar_mensaje_usuario(self, mensaje):
        self.chat = Chat.objects.select_for_update().get(
            pk=self.id_chat, estado="activo", **ChatService.filtro_propietario(self.scope["user"]))
        Mensaje.objects.create(
            id_chat=self.chat,
            contexto_clinico=self.chat.contexto_clinico_id,
            contenido=mensaje,
            es_bot=False,
            tipo="texto",
        )

        if self.chat.titulo == "Nuevo chat":
            self.chat.titulo = mensaje[:150]
            self.chat.save(update_fields=["titulo", "ultima_interaccion"])

    @database_sync_to_async
    @transaction.atomic
    def _guardar_mensaje_bymax(self, respuesta, turno=None, resultado=None):
        Mensaje.objects.create(
            id_chat=self.chat,
            contexto_clinico=self.chat.contexto_clinico_id,
            contenido=respuesta,
            resultado=resultado,
            es_bot=True,
            tipo="texto",
            modelo="bymax",
        )
        if turno is not None:
            completar_turno(turno, {"respuesta": respuesta, "resultado": resultado})
