import time

from chatbot.ai.tool_executor import ejecutar_tool
from chatbot.models import ToolLog


class ToolManager:

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