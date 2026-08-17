import logging
import re

from google.genai.types import GenerateContentConfig

from chatbot.ai.gemini_service import client
from chatbot.ai.model_config import GEMINI_MODEL


logger = logging.getLogger(__name__)


class LanguageService:
    """Localiza respuestas internas sin exponer sus valores privados."""

    @staticmethod
    def detectar(texto):
        texto = (texto or "").strip().lower()
        if re.search(r"[\u0370-\u03ff\u1f00-\u1fff]", texto):
            return "el"
        if re.search(r"\b(hi|hello|please|show|what|when|do you|my name|doctors?)\b", texto):
            return "en"
        return "es"

    @staticmethod
    def elegir(idioma, es, en, el):
        return {"en": en, "el": el}.get(idioma, es)

    @staticmethod
    def _proteger(respuesta, valores=None):
        protegida = str(respuesta)
        reemplazos = {}
        candidatos = [str(v) for v in (valores or []) if v not in (None, "")]
        candidatos.extend(
            coincidencia.group(1).strip()
            for coincidencia in re.finditer(r"(?m)^- [^:\n]+:\s*(.+)$", protegida)
        )
        for indice, valor in enumerate(sorted(set(candidatos), key=len, reverse=True)):
            if valor and valor in protegida:
                token = f"[[VALOR_{indice}]]"
                protegida = protegida.replace(valor, token)
                reemplazos[token] = valor
        return protegida, reemplazos

    @staticmethod
    def adaptar(respuesta, mensaje_usuario, valores=None):
        """Traduce al idioma del mensaje conservando intactos los datos reales."""
        if not respuesta or not mensaje_usuario:
            return respuesta
        texto = mensaje_usuario.lower()
        if re.search(
            r"\b(el|la|los|las|mi|mis|quiero|muestra|dime|cu[aá]l|"
            r"m[eé]dico|cita|hola|gracias|por favor)\b",
            texto,
        ):
            return respuesta
        protegida, reemplazos = LanguageService._proteger(respuesta, valores)
        instruccion = (
            "Translate the assistant response into the same language used by the "
            "user message. Support any human language. Preserve every token like "
            "[[VALOR_0]] exactly, preserve line breaks and do not add information. "
            "Return only the translated response.\n\n"
            f"USER MESSAGE:\n{mensaje_usuario}\n\n"
            f"ASSISTANT RESPONSE:\n{protegida}"
        )
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=instruccion,
                config=GenerateContentConfig(temperature=0, max_output_tokens=1200),
            )
            traducida = (response.text or protegida).strip()
        except Exception:
            logger.exception("No fue posible localizar la respuesta de Bymax")
            traducida = protegida
        for token, valor in reemplazos.items():
            traducida = traducida.replace(token, valor)
        return traducida
