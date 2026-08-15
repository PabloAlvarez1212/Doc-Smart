import json
import os
import re
from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig
from chatbot.ai.tool_registry import TOOLS
from chatbot.ai.gemini_service import preguntar_gemini
from chatbot.ai.router_decision import RouterDecision

load_dotenv()

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
- Para agendar_cita usa solamente estos parámetros cuando estén disponibles:
  id_medico, nombre, apellido, especialidad, ciudad y fecha.
- Convierte fechas como "24/08/2026 a las 10:00 am" al formato
  "2026-08-24 10:00" sin cambiar la hora indicada.
- Si quiere ver sus citas existentes, usa consultar_disponibilidad.
- Si quiere buscar profesionales sin agendar, usa buscar_medico.
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
def procesar_mensaje(historial, mensaje):

    contents = historial[-12:]

    if not contents:
        contents = [
            {
                "role": "user",
                "parts": [{"text": mensaje}],
            }
        ]

    response = client.models.generate_content(

        model="gemini-2.5-flash",

        contents=contents,

        config=GenerateContentConfig(
            system_instruction=PROMPT_ROUTER,
            temperature=0,
            response_mime_type="application/json",
        )

    )

    try:

        decision = extraer_json(response.text)

    except Exception:

        decision = {
            "accion": "gemini",
            "parametros": {}
        }

    # ----------------------------
    # Iniciar un flujo
    # ----------------------------

    accion = decision.get("accion", "gemini")

    if accion == "flujo":

        return RouterDecision(
            usa_flujo=True,
            iniciar_flujo=decision.get("nombre")
        )

    # ----------------------------
    # Ejecutar una Tool
    # ----------------------------

    if accion == "tool":

        return RouterDecision(
            tool=True,
            tool_name=decision.get("tool"),
            parametros=decision.get("parametros", {})
        )

    # ----------------------------
    # Responder con Gemini
    # ----------------------------

    if accion == "gemini":

        respuesta = preguntar_gemini(historial)

        return RouterDecision(
            tool=False,
            respuesta=respuesta,
        )

    # ----------------------------
    # Respuesta por defecto
    # ----------------------------

    return RouterDecision(
        tool=False,
        respuesta=preguntar_gemini(historial),
    )
