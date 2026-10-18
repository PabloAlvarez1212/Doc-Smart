import atexit
import base64
from functools import lru_cache
from weakref import WeakSet
import logging
import time

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
    RateLimitError,
)
from django.conf import settings

from chatbot.ai.model_config import OPENAI_MODEL
from chatbot.ai.prompts import SYSTEM_PROMPT


logger = logging.getLogger(__name__)

MENSAJE_ERROR = (
    "En este momento no puedo procesar tu solicitud con inteligencia "
    "artificial. Por favor, intenta nuevamente más tarde."
)

ERRORES_TRANSITORIOS = (
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
)


_clientes_abiertos = WeakSet()


def _cerrar_clientes():
    for cliente in list(_clientes_abiertos):
        try:
            cliente.close()
        except Exception:
            pass


atexit.register(_cerrar_clientes)


@lru_cache(maxsize=2)
def _cliente_compartido(api_key):
    cliente = OpenAI(api_key=api_key, timeout=30.0, max_retries=0)
    _clientes_abiertos.add(cliente)
    return cliente


def obtener_cliente():
    api_key = getattr(settings, "OPENAI_API_KEY", "")

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY no está configurada")

    # Los reintentos se controlan aquí para evitar duplicar respuestas
    # cuando el servicio se usa mediante streaming.
    return _cliente_compartido(api_key)


def convertir_historial(contents):
    """
    Convierte el historial de Gemini:
    {"role": "user"|"model", "parts": [{"text": "..."}]}

    al formato de entrada de Responses.
    """
    mensajes = []

    for item in contents or []:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        if role == "model":
            role = "assistant"

        if role not in {"user", "assistant"}:
            continue

        partes = item.get("parts") or []
        contenido = []
        for parte in partes:
            if not isinstance(parte, dict):
                continue
            if parte.get("text"):
                contenido.append({"type": "input_text", "text": str(parte["text"])})
            if parte.get("image_bytes"):
                mime = parte.get("mime_type", "image/jpeg")
                if mime not in {"image/jpeg", "image/png", "image/webp"}:
                    raise ValueError("Formato de imagen no permitido")
                datos = base64.b64encode(parte["image_bytes"]).decode("ascii")
                contenido.append({
                    "type": "input_image",
                    "image_url": f"data:{mime};base64,{datos}",
                })
        if contenido:
            # Los mensajes anteriores del asistente contienen solo texto.
            if role == "assistant":
                texto = "\n".join(p["text"] for p in contenido if p["type"] == "input_text")
                if texto:
                    mensajes.append({"role": role, "content": texto})
            else:
                mensajes.append({"role": role, "content": contenido})

    return mensajes


def _debe_reintentar(error):
    return isinstance(error, ERRORES_TRANSITORIOS) or (
        isinstance(error, APIStatusError)
        and error.status_code >= 500
    )


def preguntar_openai(contents, system_prompt=SYSTEM_PROMPT):
    mensajes = convertir_historial(contents)

    if not mensajes:
        return (
            "No recibí suficiente información para responder. "
            "Por favor, vuelve a escribir tu solicitud."
        )

    for intento in range(3):
        try:
            response = obtener_cliente().responses.create(
                model=OPENAI_MODEL,
                instructions=system_prompt,
                input=mensajes,
                max_output_tokens=1000,
                store=False,
            )

            texto = (response.output_text or "").strip()

            if texto:
                return texto

            logger.warning("OpenAI devolvió una respuesta vacía")
            return (
                "No pude generar una respuesta válida. "
                "Por favor, intenta nuevamente."
            )

        except Exception as error:
            logger.warning(
                "Error consultando OpenAI intento=%s tipo=%s",
                intento + 1,
                type(error).__name__,
            )

            if intento == 2 or not _debe_reintentar(error):
                break

            time.sleep(1.5 * (intento + 1))

    return MENSAJE_ERROR


def preguntar_openai_stream(contents, system_prompt=SYSTEM_PROMPT, cancel_event=None):
    if cancel_event is not None and cancel_event.is_set():
        return

    mensajes = convertir_historial(contents)

    if not mensajes:
        raise ValueError("contents are required")

    for intento in range(3):
        if cancel_event is not None and cancel_event.is_set():
            return
        emitio_texto = False
        stream = None

        try:
            stream = obtener_cliente().responses.create(
                model=OPENAI_MODEL,
                instructions=system_prompt,
                input=mensajes,
                max_output_tokens=1000,
                store=False,
                stream=True,
            )

            eventos = iter(stream)
            while True:
                if cancel_event is not None and cancel_event.is_set():
                    return
                try:
                    evento = next(eventos)
                except StopIteration:
                    break
                if cancel_event is not None and cancel_event.is_set():
                    return
                if evento.type == "response.output_text.delta":
                    texto = evento.delta
                    if texto:
                        emitio_texto = True
                        yield texto

                elif evento.type == "response.failed":
                    raise RuntimeError("OpenAI no pudo completar la respuesta")

            if cancel_event is not None and cancel_event.is_set():
                return

            if emitio_texto:
                return

            raise RuntimeError("OpenAI devolvió un stream vacío")

        except Exception as error:
            if cancel_event is not None and cancel_event.is_set():
                return
            logger.warning(
                "Error en stream de OpenAI intento=%s tipo=%s",
                intento + 1,
                type(error).__name__,
            )

            # Reintentar después de enviar fragmentos repetiría texto.
            if (
                emitio_texto
                or intento == 2
                or not _debe_reintentar(error)
            ):
                raise

        finally:
            close = getattr(stream, "close", None)
            if callable(close):
                try:
                    close()
                except Exception:
                    logger.debug("No se pudo cerrar el stream de OpenAI")

        demora = 1.5 * (intento + 1)
        if cancel_event is not None:
            if cancel_event.wait(demora):
                return
        else:
            time.sleep(demora)