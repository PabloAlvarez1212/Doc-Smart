import json
import logging
import os
import re
from django.utils import timezone
from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig
from chatbot.ai.tool_registry import TOOLS
from chatbot.ai.gemini_service import preguntar_gemini
from chatbot.ai.model_config import GEMINI_MODEL
from chatbot.ai.router_decision import RouterDecision
from chatbot.ai.filters import solicita_buscar_medicos

load_dotenv()

logger = logging.getLogger(__name__)

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)
def construir_herramientas():

    texto = ""

    for nombre, tool in TOOLS.items():

        texto += (
            f"- {nombre}: {tool.descripcion}\n"
        )

    return texto


PROMPT_ROUTER = f"""
Eres el Router de Bymax.

Nunca respondas preguntas.

Tu única función es decidir qué hacer.

Debes considerar toda la conversación recibida, no solamente el último mensaje.
Si el usuario hace una pregunta de seguimiento como "¿está disponible?",
recupera del historial el médico, la especialidad y la fecha mencionados antes.

Puedes devolver una de tres acciones:

1.
{{
 "accion":"gemini"
}}

2.
{{
 "accion":"tool",
 "tool":"agendar_cita",
 "parametros":{{
   "nombre":"Edilma",
   "apellido":"Echeverry",
   "especialidad":"cirugía",
   "ciudad":null,
   "fecha":"2026-08-24 10:00"
 }}
}}

3.
{{
 "accion":"flujo",
 "nombre":"agendar_cita"
}}

Flujos disponibles:

- agendar_cita: cuando el usuario quiere solicitar una cita nueva.
- reprogramar_cita: cuando quiere cambiar la fecha de una cita existente.
- cancelar_cita: cuando quiere cancelar una cita existente.

Usa un flujo si faltan datos necesarios para ejecutar la operación.
Usa una herramienta directamente solo si el mensaje ya contiene todos los datos.

Reglas obligatorias:

- Si el usuario quiere una cita y ya indicó médico o especialidad y fecha,
  usa la herramienta agendar_cita. Esta herramienta primero verifica la
  disponibilidad y solicita confirmación; no crea la cita inmediatamente.
- Extrae en una sola respuesta todos los datos que el usuario haya escrito.
  Nunca descartes especialidad, médico, ciudad, fecha u hora ya mencionados.
- Si quiere agendar pero falta algún dato necesario, inicia agendar_cita y
  devuelve también en parametros todos los datos que sí fueron encontrados.
- Para agendar_cita usa solamente estos parámetros cuando estén disponibles:
  id_medico, nombre, apellido, especialidad, ciudad y fecha.
- Convierte fechas como "24/08/2026 a las 10:00 am" al formato
  "2026-08-24 10:00" sin cambiar la hora indicada.
- Si quiere ver sus citas existentes, usa consultar_disponibilidad.
- Si quiere buscar profesionales sin agendar, usa buscar_medico.
- Si pregunta en cualquier idioma por su nombre, edad, nacimiento, datos
  personales, perfil o "todo lo que sabes de mí", usa consultar_perfil.
  Usa el parámetro tipo con uno de estos valores: nombre, edad,
  fecha_nacimiento, nombre_edad, perfil o memoria. Si pide nombre y edad
  simultáneamente, usa nombre_edad. Esto NO es el historial clínico.
- Usa consultar_historial solamente si menciona explícitamente su historia
  clínica, diagnósticos, consultas médicas o registros clínicos.
- Si quiere reprogramar y faltan el id o la nueva fecha, inicia
  reprogramar_cita. Si ya están ambos, usa esa herramienta directamente.
- Si quiere cancelar y falta el id, inicia cancelar_cita. Si ya está,
  usa esa herramienta directamente.
- Nunca elijas gemini para afirmar que vas a consultar la base de datos.
- Devuelve exclusivamente un objeto JSON válido, sin Markdown ni explicaciones.

Herramientas:

{construir_herramientas()}
"""

def extraer_json(texto):

    try:
        return json.loads(texto)
    except Exception:
        pass

    coincidencia = re.search(r"\{.*\}", texto, re.DOTALL)

    if coincidencia:

        try:
            return json.loads(coincidencia.group())
        except Exception:
            pass

    return {
        "accion": "gemini",
        "parametros": {}
    }

PATRON_CONSULTA_MEDICA = re.compile(
    r"\b("
    r"s[ií]ntoma|fiebre|dolor|mareo|n[aá]usea|v[oó]mito|"
    r"diagn[oó]stico|medicamento|acetaminof[eé]n|paracetamol|"
    r"dosis|alergia|peso|edad|a[nñ]os|me siento|me duele|"
    r"tom[eé]|tomado|enfermedad|temperatura"
    r")\b",
    re.IGNORECASE,
)

PATRON_SOLICITUD_CITA = re.compile(
    r"\b("
    r"agendar|reservar|programar|pedir|solicitar|sacar"
    r")\b.{0,30}\b(cita|consulta)\b|"
    r"\b(cita|consulta)\b.{0,30}\b("
    r"agendar|reservar|programar|pedir|solicitar|sacar"
    r")\b",
    re.IGNORECASE,
)
def _respuesta_gemini(contents, streaming=False):
    if streaming:
        return RouterDecision(
            tool=False,
            respuesta=None,
            parametros={
                "__stream_gemini__": True,
                "contents": contents,
            },
        )

    return RouterDecision(
        tool=False,
        respuesta=preguntar_gemini(contents),
    )


def procesar_mensaje(historial, mensaje, streaming=False):

    if solicita_buscar_medicos(mensaje):
        return RouterDecision(
            tool=True,
            tool_name="buscar_medico",
            parametros={},
        )

    mensaje_actual = str(mensaje or "").strip()

    # Copiamos el historial para no modificar la lista original.
    contents = list(historial or [])[-12:]


    # El mensaje actual debe agregarse siempre.
    # Antes solo se agregaba cuando el historial estaba vacío.
    ultimo_texto = ""
    if contents:
        try:
            ultimo = contents[-1]
            partes = ultimo.get("parts", [])

            if partes:
                ultimo_texto = str(partes[-1].get("text", "")).strip()
        except (AttributeError, IndexError, TypeError):
            ultimo_texto = ""

    # Evita duplicarlo si ConversationManager ya lo agregó al historial.
    if mensaje_actual and ultimo_texto != mensaje_actual:
        contents.append({
            "role": "user",
            "parts": [
                {
                    "text": mensaje_actual,
                }
            ],
        })

    es_consulta_medica = bool(PATRON_CONSULTA_MEDICA.search(mensaje_actual))
    solicita_cita_explicita = bool(
        PATRON_SOLICITUD_CITA.search(mensaje_actual)
    )

    # El mensaje actual ya está incluido en `contents`. Esto evita el error
    # "contents are required" y mantiene el contexto de síntomas anteriores.
    if es_consulta_medica and not solicita_cita_explicita:
        return _respuesta_gemini(contents, streaming=streaming)

    if not contents:
        return RouterDecision(
            tool=False,
            respuesta=(
                "No recibí el contenido de tu mensaje. "
                "Por favor, vuelve a intentarlo."
            ),
        )

    try:
        fecha_actual = timezone.localdate().isoformat()

        instruccion_router = (
            f"{PROMPT_ROUTER}\n"
            f"La fecha local actual es {fecha_actual}. "
            "Si una fecha no incluye año, usa la próxima ocurrencia futura."
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents,
            config=GenerateContentConfig(
                system_instruction=instruccion_router,
                temperature=0,
                response_mime_type="application/json",
            ),
        )

        decision = extraer_json(response.text or "")

    except Exception as error:
        logger.error(
            "No fue posible consultar el router de Gemini tipo=%s",
            type(error).__name__,
        )

        return RouterDecision(
            tool=False,
            respuesta=(
                "En este momento no puedo procesar tu solicitud. "
                "Por favor, intenta nuevamente en unos segundos."
            ),
        )

    accion = decision.get("accion", "gemini")

    if accion == "flujo":
        return RouterDecision(
            usa_flujo=True,
            iniciar_flujo=decision.get("nombre"),
            parametros=decision.get("parametros", {}),
        )

    if accion == "tool":
        return RouterDecision(
            tool=True,
            tool_name=decision.get("tool"),
            parametros=decision.get("parametros", {}),
        )

    if accion == "gemini":
        return _respuesta_gemini(contents, streaming=streaming)

    return _respuesta_gemini(contents, streaming=streaming)
