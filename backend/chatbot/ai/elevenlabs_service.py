import asyncio
import logging
import re
import threading
import requests
from django.conf import settings

logger = logging.getLogger(__name__)
_http = threading.local()

class ElevenLabsError(Exception):
    def __init__(self, mensaje, status_code=503):
        super().__init__(mensaje)
        self.status_code = status_code


def _http_session():
    # requests.Session is reused within a worker, never concurrently across threads.
    if not getattr(_http, 'session', None):
        _http.session = requests.Session()
    return _http.session


def limpiar_texto_para_voz(texto):
    texto = str(texto or '').strip()
    texto = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', texto)
    texto = re.sub(r'https?://\S+', '', texto)
    texto = re.sub(r'[*_#>`~]', '', texto)
    texto = re.sub(r'[ \t]+', ' ', texto)
    return re.sub(r'\n{3,}', '\n\n', texto).strip()


def _solicitar_audio(texto, velocidad, streaming=False):
    if not settings.ELEVENLABS_API_KEY or not settings.ELEVENLABS_VOICE_ID:
        raise ElevenLabsError('La voz de Bymax no está configurada.')
    texto = limpiar_texto_para_voz(texto)[:2500]
    if not texto:
        raise ElevenLabsError('No se recibió texto válido.', 400)
    try:
        velocidad = max(.7, min(1.2, float(velocidad)))
    except (TypeError, ValueError):
        velocidad = .96
    suffix = '/stream' if streaming else ''
    try:
        response = _http_session().post(
            f'https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}{suffix}',
            params={'output_format':'mp3_44100_128'},
            headers={'xi-api-key':settings.ELEVENLABS_API_KEY,'Content-Type':'application/json','Accept':'audio/mpeg'},
            json={'text':texto,'model_id':settings.ELEVENLABS_MODEL_ID,'voice_settings':{'stability':.5,'similarity_boost':.75,'style':0.,'use_speaker_boost':True,'speed':velocidad}},
            timeout=(8,60), stream=streaming,
        )
    except requests.Timeout as error:
        raise ElevenLabsError('La voz de Bymax tardó demasiado en responder.',504) from error
    except requests.RequestException as error:
        raise ElevenLabsError('El servicio de voz de Bymax no está disponible.',503) from error
    status = response.status_code
    if not response.ok or 'audio' not in response.headers.get('Content-Type',''):
        response.close()
        raise ElevenLabsError('No fue posible generar la voz de Bymax.',429 if status==429 else 503)
    return response


def generar_audio_bymax(texto, velocidad=.96):
    response = _solicitar_audio(texto, velocidad)
    try:
        return response.content
    finally:
        response.close()


def generar_audio_bymax_stream(texto, velocidad=.96):
    # Open upstream in the sync view so authentication/validation/upstream errors
    # still have a proper HTTP status before streaming response headers are sent.
    response = _solicitar_audio(texto, velocidad, streaming=True)
    async def chunks():
        iterator = response.iter_content(chunk_size=2048)
        sentinel = object()
        try:
            while True:
                chunk = await asyncio.to_thread(next, iterator, sentinel)
                if chunk is sentinel:
                    break
                if chunk:
                    yield chunk
        finally:
            await asyncio.to_thread(response.close)
    return chunks()
