import time

from chatbot.ai.tool_executor import ejecutar_tool
from chatbot.models import ToolLog
from chatbot.ai.language import LanguageService


class ToolManager:

    @staticmethod
    def _valores_respuesta(valor):
        if isinstance(valor, dict):
            valores = []
            for elemento in valor.values():
                valores.extend(ToolManager._valores_respuesta(elemento))
            return valores
        if isinstance(valor, (list, tuple)):
            valores = []
            for elemento in valor:
                valores.extend(ToolManager._valores_respuesta(elemento))
            return valores
        return [valor] if valor not in (None, "", True, False) else []

    @staticmethod
    def _localizar(respuesta, mensaje):
        if isinstance(respuesta, dict) and isinstance(respuesta.get("message"), str):
            respuesta = dict(respuesta)
            valores = ToolManager._valores_respuesta(respuesta.get("data", {}))
            respuesta["message"] = LanguageService.adaptar(
                respuesta["message"], mensaje, valores
            )
        elif isinstance(respuesta, str):
            respuesta = LanguageService.adaptar(respuesta, mensaje)
        return respuesta

    @staticmethod
    def ejecutar(
        nombre_tool,
        chat,
        mensaje,
        parametros,
    ):

        inicio = time.time()

        try:

            respuesta = ejecutar_tool(

                nombre_tool=nombre_tool,

                chat=chat,

                mensaje=mensaje,

                parametros=parametros,

            )

            respuesta = ToolManager._localizar(respuesta, mensaje)

            ToolLog.objects.create(

                usuario=chat.id_usuario,

                nombre_tool=nombre_tool,

                parametros=parametros,

                respuesta=respuesta,

                correcto=True,

                latencia=time.time() - inicio,

            )

            return respuesta

        except Exception as e:

            ToolLog.objects.create(

                usuario=chat.id_usuario,

                nombre_tool=nombre_tool,

                parametros=parametros,

                respuesta={

                    "error": str(e)

                },

                correcto=False,

                latencia=time.time() - inicio,

            )

            raise
