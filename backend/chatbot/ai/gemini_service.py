import logging
import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig

from chatbot.ai.model_config import GEMINI_MODEL
from chatbot.ai.prompts import SYSTEM_PROMPT

load_dotenv()

logger = logging.getLogger(__name__)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def preguntar_gemini(contents):
    """
    Genera la respuesta conversacional de Bymax.

    `contents` debe incluir el historial y el mensaje actual.
    """

    contents = list(contents or [])

    if not contents:
        logger.error("Se intentó consultar Gemini sin contenido")

        return (
            "No recibí suficiente información para responder. "
            "Por favor, vuelve a escribir tu solicitud."
        )

    ultimo_error = None

    for intento in range(3):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=contents,
                config=GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.6,
                    max_output_tokens=1000,
                ),
            )

            texto = getattr(response, "text", None)

            if texto:
                return texto.strip()

            logger.warning("Gemini devolvió una respuesta vacía")

            return (
                "No pude generar una respuesta válida. "
                "Por favor, intenta nuevamente."
            )

        except Exception as error:
            ultimo_error = error
            mensaje_error = str(error).lower()

            logger.warning(
                "Error consultando Gemini intento=%s tipo=%s",
                intento + 1,
                type(error).__name__,
            )

            # Estos errores no se solucionan repitiendo inmediatamente.
            if (
                "contents are required" in mensaje_error
                or "not_found" in mensaje_error
                or "404" in mensaje_error
                or "resource_exhausted" in mensaje_error
                or "429" in mensaje_error
            ):
                break

            time.sleep(2)

    logger.error(
        "Error definitivo de Gemini tipo=%s",
        type(ultimo_error).__name__ if ultimo_error else "desconocido",
    )

    return (
        "En este momento no puedo procesar tu solicitud con inteligencia "
        "artificial. Por favor, intenta nuevamente más tarde."
    )


def preguntar_gemini_stream(contents):
    """Entrega fragmentos de texto a medida que Gemini los genera."""

    contents = list(contents or [])
    if not contents:
        raise ValueError("contents are required")

    for intento in range(3):
        emitio_texto = False
        try:
            response = client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=contents,
                config=GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.6,
                    max_output_tokens=1000,
                ),
            )

            for chunk in response:
                texto = getattr(chunk, "text", None)
                if texto:
                    emitio_texto = True
                    yield texto

            if emitio_texto:
                return

            raise RuntimeError("Gemini devolvió un stream vacío")

        except Exception as error:
            logger.warning(
                "Error en stream de Gemini intento=%s tipo=%s",
                intento + 1,
                type(error).__name__,
            )

            # Reintentar después de haber emitido texto duplicaría la respuesta.
            if emitio_texto or intento == 2:
                raise

            mensaje_error = str(error).lower()
            if any(
                codigo in mensaje_error
                for codigo in (
                    "contents are required",
                    "not_found",
                    "404",
                    "resource_exhausted",
                    "429",
                )
            ):
                raise

            time.sleep(1.5 * (intento + 1))
