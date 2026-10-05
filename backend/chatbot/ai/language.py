import logging
import re
from contextvars import ContextVar

from chatbot.ai.openai_service import obtener_cliente
from chatbot.ai.model_config import OPENAI_MODEL


logger = logging.getLogger(__name__)
idioma_actual = ContextVar('bymax_idioma', default=None)


class LanguageService:
    """Localiza respuestas internas sin exponer sus valores privados."""

    @staticmethod
    def detectar(texto):
        texto = (texto or "").strip().lower()
        if re.search(r"[\u0370-\u03ff\u1f00-\u1fff]", texto):
            return "el"
        if re.search(r'\b(bonjour|quel|quelle|montrez|mon profil|français|francais)\b', texto):
            return 'fr'

        if re.search(
            r"\b(busca|buscar|disponibilidad|m[eé]dico|cita|"
            r"ese|mismo|para|las|tarde|ma[nñ]ana|quiero)\b",
            texto,
        ):
            return "es"
        
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
    def adaptar(respuesta, mensaje_usuario, valores=None, idioma=None):
        """Traduce al idioma del mensaje conservando intactos los datos reales."""
        if not respuesta or not mensaje_usuario:
            return respuesta
        idioma = idioma or idioma_actual.get() or LanguageService.detectar(mensaje_usuario)
        if idioma == 'es':
            return respuesta
        protegida, reemplazos = LanguageService._proteger(respuesta, valores)
        instruccion = (
            f"Translate the assistant response into {idioma}. Preserve every token like "
            "[[VALOR_0]] exactly, preserve line breaks and do not add information. "
            "Return only the translated response.\n\n"
            f"USER MESSAGE:\n{mensaje_usuario}\n\n"
            f"ASSISTANT RESPONSE:\n{protegida}"
        )
        try:
            response = obtener_cliente().responses.create(
                model=OPENAI_MODEL,
                instructions="Traduce únicamente el texto solicitado. Conserva cada token protegido sin cambios.",
                input=instruccion,
                max_output_tokens=1200,
                store=False,
            )
            traducida = (response.output_text or protegida).strip()
        except Exception as error:
            logger.warning(
                "No fue posible localizar la respuesta de Bymax tipo=%s",
                type(error).__name__,
            )
            traducida = protegida
        for token, valor in reemplazos.items():
            traducida = traducida.replace(token, valor)
        return traducida
