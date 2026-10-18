import asyncio
import logging
import time
import uuid
from contextvars import ContextVar
from threading import Event
from types import SimpleNamespace
from chatbot.throttles import ActorScopedRateThrottle

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db import close_old_connections
from django.db import transaction
from chatbot.services.turn_service import iniciar_turno, completar_turno, json_seguro
from chatbot.services.diagnostics import error_operativo

from chatbot.ai.conversation_manager import ConversationManager
from chatbot.ai.openai_service import preguntar_openai_stream
from chatbot.models import Chat, Mensaje
from chatbot.services.chat_service import ChatService
from chatbot.ai.doctor_conversation import DOCTOR_SYSTEM_PROMPT
from medicos.models import Medico


logger = logging.getLogger(__name__)
_respuesta_contexto = ContextVar("bymax_respuesta", default=None)


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
        self.respuesta_actual = None
        self.tareas_en_curso = set()
        self.preparacion_lock = asyncio.Lock()
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

    def _cancelar_respuesta(self, response_id=None, request_id=None):
        estado = getattr(self, "respuesta_actual", None)
        if estado is None:
            return None
        if response_id and response_id != estado["response_id"]:
            return None
        if request_id and request_id != estado["request_id"]:
            return None
        estado["cancel_event"].set()
        cola = estado.get("cola")
        if cola is not None:
            cola.put_nowait(("cancelado", None))
        return estado

    def _retener_tarea(self, tarea):
        if not hasattr(self, "tareas_en_curso"):
            self.tareas_en_curso = set()
        self.tareas_en_curso.add(tarea)
        tarea.add_done_callback(self.tareas_en_curso.discard)

    async def send_json(self, content, close=False):
        estado = _respuesta_contexto.get()
        if estado is not None:
            if estado["cancel_event"].is_set() and content.get("tipo") != "cancelado":
                return
            if content.get("tipo") == "texto" and "first_text_ms" not in estado:
                estado["first_text_ms"] = round((time.perf_counter() - estado.get("started_at", time.perf_counter())) * 1000, 2)
            content = {"response_id": estado["response_id"], "request_id": estado["request_id"], **content}
        if not getattr(self, "desconectado", False):
            await super().send_json(content, close=close)

    async def receive_json(self, content, **kwargs):
        datos = content if isinstance(content, dict) else {}
        estado = {
            "response_id": str(uuid.uuid4()),
            "request_id": datos.get("request_id") or str(uuid.uuid4()),
            "cancel_event": Event(),
            "cola": None,
        }
        token = _respuesta_contexto.set(estado)
        try:
            await self._recibir_json(content, estado, **kwargs)
        finally:
            _respuesta_contexto.reset(token)

    async def _recibir_json(self, content, estado, **kwargs):
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
            anterior = self._cancelar_respuesta(content.get("response_id"), content.get("request_id"))
            if anterior is not None:
                await self.send_json({"tipo": "cancelado", "response_id": anterior["response_id"], "request_id": anterior["request_id"]})
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

        anterior = getattr(self, "respuesta_actual", None)
        activa = getattr(self, "tarea_respuesta", None)
        if anterior and activa and not activa.done() and anterior["request_id"] == estado["request_id"]:
            if anterior.get("mensaje") != mensaje:
                await self.send_json({"tipo": "error", "mensaje": "El identificador ya corresponde a otro mensaje."})
            else:
                await self.send_json({"tipo": "en_proceso", "response_id": anterior["response_id"], "request_id": anterior["request_id"]})
            return
        estado["mensaje"] = mensaje
        permitido = await database_sync_to_async(ActorScopedRateThrottle().allow_request)(
            SimpleNamespace(user=self.scope["user"]), SimpleNamespace(throttle_scope="bymax_chat"))
        if not permitido:
            await self.send_json({"tipo": "error", "mensaje": "Has alcanzado el límite temporal. Espera antes de enviar otra solicitud."})
            return
        self._cancelar_respuesta()
        self.respuesta_actual = estado
        self.tarea_respuesta = asyncio.create_task(self._responder(mensaje, estado["request_id"], estado))
        self._retener_tarea(self.tarea_respuesta)

    async def _responder(self, mensaje, request_id=None, estado=None):
        if estado is None:
            estado = {"response_id": str(uuid.uuid4()), "request_id": request_id,
                      "cancel_event": Event(), "cola": None}
        estado["started_at"] = time.perf_counter()
        token = _respuesta_contexto.set(estado)
        try:
            await self._responder_turno(mensaje, request_id, estado)
        finally:
            try:
                id_log = str(uuid.UUID(str(request_id)))
            except (ValueError, TypeError, AttributeError):
                id_log = "invalid"
            logger.info(
                "Bymax latency request_id=%s response_id=%s preparation_ms=%s first_text_ms=%s total_ms=%.2f cancelled=%s",
                id_log, estado["response_id"], estado.get("preparation_ms"),
                estado.get("first_text_ms"), (time.perf_counter() - estado["started_at"]) * 1000,
                estado["cancel_event"].is_set(),
            )
            _respuesta_contexto.reset(token)

    async def _responder_turno(self, mensaje, request_id, estado):
        respuesta_completa = ""
        turno = None
        try:
            if not hasattr(self, "preparacion_lock"):
                self.preparacion_lock = asyncio.Lock()
            async with self.preparacion_lock:
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
                estado["chat"] = self.chat
                await self.send_json({"tipo": "inicio"})

                if estado["cancel_event"].is_set():
                    await database_sync_to_async(completar_turno)(turno, {"respuesta": "", "resultado": None, "cancelado": True})
                    return

                resultado = await database_sync_to_async(
                    ConversationManager.procesar,
                    thread_sensitive=False,
                )(self.chat, mensaje, streaming=True)

            estado["preparation_ms"] = round((time.perf_counter() - estado["started_at"]) * 1000, 2)
            if isinstance(resultado, dict) and resultado.get("stream"):
                respuesta_completa = await self._transmitir_openai(
                    resultado.get("contents", []), estado
                )
                resultado_estructurado = None
                if estado["cancel_event"].is_set():
                    if respuesta_completa:
                        await self._guardar_mensaje_bymax(respuesta_completa, turno, {"cancelado": True})
                    else:
                        await database_sync_to_async(completar_turno)(turno, {"respuesta": "", "resultado": None, "cancelado": True})
                    return
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
                seguro = await database_sync_to_async(error_operativo)(estado.get("chat", self.chat), "responder")
                texto, resultado = _normalizar_respuesta(seguro)
                await self._guardar_mensaje_bymax(texto, turno, resultado)
                await self.send_json({"tipo": "fin", **turno.respuesta})
            else:
                await self.send_json({"tipo": "error", "mensaje": "No fue posible procesar el mensaje."})

    async def _transmitir_openai(self, contents, estado=None):
        estado = estado or _respuesta_contexto.get() or {
            "cancel_event": Event(), "cola": None,
        }
        cancel_event = estado["cancel_event"]
        cola = asyncio.Queue()
        loop = asyncio.get_running_loop()
        estado["cola"] = cola
        es_medico = bool(estado.get("chat", self.chat).id_medico_id)

        def encolar(tipo, valor):
            if not loop.is_closed():
                try:
                    loop.call_soon_threadsafe(cola.put_nowait, (tipo, valor))
                except RuntimeError:
                    pass

        def producir():
            close_old_connections()
            try:
                opciones = {"system_prompt": DOCTOR_SYSTEM_PROMPT} if es_medico else {}
                for fragmento in preguntar_openai_stream(contents, cancel_event=cancel_event, **opciones):
                    if cancel_event.is_set():
                        break
                    encolar("texto", fragmento)
            except Exception as error:
                encolar("error", error)
            finally:
                close_old_connections()
                encolar("fin", None)

        tarea_productora = asyncio.create_task(asyncio.to_thread(producir))
        self._retener_tarea(tarea_productora)
        partes = []

        try:
            while not cancel_event.is_set():
                tipo, valor = await cola.get()
                if cancel_event.is_set():
                    break
                if tipo == "texto":
                    partes.append(valor)
                    await self.send_json({"tipo": "texto", "contenido": valor})
                elif tipo == "error":
                    raise valor
                else:
                    break
        finally:
            estado["cola"] = None
            if not cancel_event.is_set():
                await tarea_productora

        return "".join(partes).strip()

    @database_sync_to_async
    def _obtener_chat(self, usuario):
        chat = ChatService.obtener_chat(self.id_chat, usuario)
        if chat is not None:
            self._cachear_actor(chat, usuario)
        return chat

    @staticmethod
    def _cachear_actor(chat, usuario):
        # Ownership was checked by the query. Reuse the authenticated object
        # for lazy FK access instead of issuing the same actor query again.
        campo = "id_medico" if isinstance(usuario, Medico) else "id_usuario"
        if getattr(chat, f"{campo}_id", None) == usuario.pk:
            setattr(chat, campo, usuario)

    @database_sync_to_async
    def _medico_aprobado(self, medico):
        return medico.esta_aprobado

    @database_sync_to_async
    @transaction.atomic
    def _guardar_mensaje_usuario(self, mensaje):
        self.chat = Chat.objects.select_for_update().get(
            pk=self.id_chat, estado="activo", **ChatService.filtro_propietario(self.scope["user"]))
        self._cachear_actor(self.chat, self.scope["user"])
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
        chat = (_respuesta_contexto.get() or {}).get("chat", self.chat)
        Mensaje.objects.create(
            id_chat=chat,
            contexto_clinico=chat.contexto_clinico_id,
            contenido=respuesta,
            resultado=resultado,
            es_bot=True,
            tipo="texto",
            modelo="bymax",
        )
        if turno is not None:
            completar_turno(turno, {"respuesta": respuesta, "resultado": resultado})
