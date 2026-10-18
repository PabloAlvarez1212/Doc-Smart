from chatbot.ai.filters import normalizar_intencion

RESPUESTAS_NO_VALIDAS = {
    "si",
    "confirmo",
    "acepto",
    "no",
    "cancelar",
    "cancela",
    "salir",
    "detener",
    "olvidalo",
}


def normalizar_motivo_cancelacion(valor):
    if not isinstance(valor, str):
        return None
    motivo = valor.strip()
    if not motivo or len(motivo) > 500:
        return None
    if normalizar_intencion(motivo) in RESPUESTAS_NO_VALIDAS:
        return None
    return motivo