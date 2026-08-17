from google.genai import types
from google.genai.types import GenerateContentConfig

from chatbot.ai.gemini_service import client
from chatbot.ai.model_config import GEMINI_MODEL


MIME_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGEN_BYTES = 8 * 1024 * 1024


def validar_imagen_medica(archivo):
    if archivo.size > MAX_IMAGEN_BYTES:
        return "La imagen supera el límite de 8 MB."
    if archivo.content_type not in MIME_PERMITIDOS:
        return "Solo se permiten imágenes JPG, PNG o WEBP."
    return None


def analizar_imagen_medica(archivo, pregunta=""):
    error = validar_imagen_medica(archivo)
    if error:
        raise ValueError(error)

    datos = archivo.read()
    prompt = f"""
Eres Bymax, asistente médico de DocSmart.
Responde en el mismo idioma de la pregunta del usuario.

Primero determina si la imagen tiene una finalidad médica o de salud (por
ejemplo piel, lesión, resultado, fórmula, radiografía o documento clínico).
Si no tiene carácter médico, rechaza brevemente el análisis y explica que solo
puedes revisar imágenes relacionadas con salud.

Si es médica:
- describe únicamente lo que sea visible;
- no identifiques personas;
- no des un diagnóstico definitivo;
- indica las limitaciones de analizar una imagen sin examen físico;
- ofrece orientación preliminar breve y la especialidad apropiada;
- recomienda valoración por un profesional real;
- si observas posibles señales de urgencia, indica buscar atención inmediata.
- no inventes texto ilegible ni hallazgos que no puedan verse.

Pregunta del usuario: {pregunta or 'Analiza esta imagen médica.'}
"""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=datos, mime_type=archivo.content_type),
            prompt,
        ],
        config=GenerateContentConfig(temperature=0.2, max_output_tokens=900),
    )
    return response.text or "No pude analizar la imagen en este momento."
