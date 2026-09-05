import json
import logging
import os

from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig

from chatbot.ai.context_manager import actualizar_contexto, obtener_contexto
from chatbot.ai.model_config import GEMINI_MODEL


load_dotenv()

logger = logging.getLogger(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

INDICADORES_MEMORIA = {
    "me llamo",
    "llamame",
    "llámame",
    "mi nombre es",
    "vivo en",
    "soy de",
    "prefiero",
    "recuerda",
    "soy alergico",
    "soy alérgico",
    "soy alergica",
    "soy alérgica",
    "tengo alergia",
    "tengo diabetes",
    "tengo hipertension",
    "tengo hipertensión",
    "tomo ",
    "my name is",
    "call me",
    "i live in",
    "i am allergic",
    "remember that",
    "i prefer",
}

PROMPT_EXTRACTOR = """
Extrae únicamente información explícita, duradera y útil que el usuario haya
declarado sobre sí mismo. Devuelve exclusivamente JSON válido.

Formato permitido:
{
  "perfil": {
    "nombre_preferido": "",
    "idioma": "",
    "ciudad": ""
  },
  "preferencias": {
    "estilo_respuesta": ""
  },
  "salud_declarada": {
    "alergias": [],
    "condiciones_cronicas": [],
    "medicamentos": []
  }
}

Reglas:
- Omite campos que no estén presentes en el mensaje.
- No infieras diagnósticos ni conviertas síntomas pasajeros en condiciones.
- Guarda datos de salud solo cuando el usuario los declare explícitamente como
  alergia, condición crónica o medicamento habitual.
- Nunca extraigas contraseñas, tokens, documentos, información financiera,
  direcciones exactas ni secretos.
- No copies preguntas ni instrucciones del usuario como hechos personales.
"""


def es_candidato_memoria(mensaje):
    texto = (mensaje or "").lower()
    return any(indicador in texto for indicador in INDICADORES_MEMORIA)


def extraer_y_guardar_memoria(chat, mensaje):
    if not es_candidato_memoria(mensaje):
        return {}

    contexto_actual = obtener_contexto(chat)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=(
                "Memoria actual:\n"
                f"{json.dumps(contexto_actual, ensure_ascii=False)}\n\n"
                "Mensaje nuevo del usuario:\n"
                f"{mensaje}"
            ),
            config=GenerateContentConfig(
                system_instruction=PROMPT_EXTRACTOR,
                temperature=0,
                response_mime_type="application/json",
                max_output_tokens=500,
            ),
        )
        nuevos_datos = json.loads(response.text or "{}")
    except Exception as error:
        logger.warning(
            "No fue posible actualizar la memoria de Bymax tipo=%s",
            type(error).__name__,
        )
        return {}

    if not isinstance(nuevos_datos, dict):
        return {}

    actualizar_contexto(chat, nuevos_datos)
    return nuevos_datos
