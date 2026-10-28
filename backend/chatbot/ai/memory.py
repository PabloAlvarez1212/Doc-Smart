from chatbot.models import Mensaje


MAX_MENSAJES_CONTEXTO = 30


def construir_historial(chat):
    """
    Construye el historial de conversación para Bymax.
    """

    historial = []

    mensajes = list(
        Mensaje.objects
        .filter(id_chat=chat)
        .order_by("-fecha")
        .values("contenido", "es_bot")
        [:MAX_MENSAJES_CONTEXTO]
    )
    mensajes.reverse()

    for mensaje in mensajes:

        historial.append({
            "role": "model" if mensaje["es_bot"] else "user",
            "parts": [
                {
                    "text": mensaje["contenido"]
                }
            ]
        })

    return historial
