import logging
import re

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


class ElevenLabsError(Exception):
    def __init__(self, mensaje, status_code=503):
        super().__init__(mensaje)
        self.status_code = status_code


def limpiar_texto_para_voz(texto):
    texto = str(texto or "").strip()
    texto = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", texto)
    texto = re.sub(r"https?://\S+", "", texto)
    texto = re.sub(r"[*_#>`~]", "", texto)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


def generar_audio_bymax(texto, velocidad=0.96):
    api_key = settings.ELEVENLABS_API_KEY
    voice_id = settings.ELEVENLABS_VOICE_ID
    model_id = settings.ELEVENLABS_MODEL_ID

    if not api_key:
        raise ElevenLabsError("La voz de Bymax no está configurada.")
    if not voice_id:
        raise ElevenLabsError("No se configuró la identidad de voz de Bymax.")

    texto_limpio = limpiar_texto_para_voz(texto)
    if not texto_limpio:
        raise ElevenLabsError("No se recibió texto válido.", status_code=400)
    texto_limpio = texto_limpio[:2500]

    try:
        velocidad = max(0.7, min(1.2, float(velocidad)))
    except (TypeError, ValueError):
        velocidad = 0.96

    response = None
    try:
        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            params={"output_format": "mp3_44100_128"},
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": texto_limpio,
                "model_id": model_id,
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                    "speed": velocidad,
                },
            },
            timeout=(8, 60),
        )
    except requests.Timeout as error:
        raise ElevenLabsError(
            "La voz de Bymax tardó demasiado en responder.", 504
        ) from error
    except requests.RequestException as error:
        logger.error(
            "No fue posible conectar con ElevenLabs tipo=%s",
            type(error).__name__,
        )
        raise ElevenLabsError(
            "El servicio de voz de Bymax no está disponible.", 503
        ) from error

    if response.status_code == 429:
        raise ElevenLabsError(
            "Se alcanzó temporalmente el límite del servicio de voz.", 429
        )
    if response.status_code in (401, 403):
        logger.error("ElevenLabs rechazó las credenciales")
        raise ElevenLabsError(
            "La identidad de voz de Bymax no está configurada correctamente.",
            503,
        )
    if not response.ok:
        logger.error("ElevenLabs rechazó la solicitud estado=%s", response.status_code)
        raise ElevenLabsError("No fue posible generar la voz de Bymax.", 503)
    if "audio" not in response.headers.get("Content-Type", ""):
        raise ElevenLabsError("El servicio de voz devolvió una respuesta inválida.", 503)

    return response.content
