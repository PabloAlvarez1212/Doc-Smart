from chatbot.ai.tool_registry import TOOLS


def ejecutar_tool(
    nombre_tool,
    chat,
    mensaje,
    parametros,
):

    tool = TOOLS.get(nombre_tool)

    if tool is None:
        return {
            "success": False,
            "message": "La herramienta solicitada no existe.",
            "data": {}
        }

    if not tool.habilitada:
        return {
            "success": False,
            "message": "La herramienta está deshabilitada.",
            "data": {}
        }

    # Herramienta basada en clases
    if hasattr(tool.funcion, "execute"):

        return tool.funcion.execute(
            chat=chat,
            mensaje=mensaje,
            parametros=parametros,
        )


    return tool.funcion(
        chat=chat,
        mensaje=mensaje,
        parametros=parametros,
    )