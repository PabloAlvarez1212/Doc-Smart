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

    es_medico = bool(getattr(chat, "id_medico_id", None))
    if tool.solo_medicos != es_medico:
        return {"success": False, "message": "Esta herramienta no está disponible para tu cuenta.", "data": {}}

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
