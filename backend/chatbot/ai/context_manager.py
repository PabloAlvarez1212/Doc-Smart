import json

from chatbot.models import SesionBymax


def obtener_sesion(usuario):
    """
    Obtiene o crea la sesión permanente de Bymax.
    """

    sesion, _ = SesionBymax.objects.get_or_create(
        usuario=usuario
    )

    return sesion


def obtener_contexto(chat):
    """
    Devuelve el contexto almacenado del usuario.
    """

    sesion = obtener_sesion(chat.id_usuario)

    if not sesion.contexto_acumulado:
        return {}

    try:
        return json.loads(
            sesion.contexto_acumulado
        )

    except json.JSONDecodeError:
        return {}


def guardar_contexto(chat, contexto):
    """
    Guarda completamente el contexto.
    """

    sesion = obtener_sesion(chat.id_usuario)

    sesion.contexto_acumulado = json.dumps(
        contexto,
        ensure_ascii=False
    )

    sesion.save(
        update_fields=[
            "contexto_acumulado",
            "ultima_conversacion"
        ]
    )


def actualizar_contexto(chat, nuevos_datos):
    """
    Fusiona el contexto existente con nuevos datos.
    """

    contexto = obtener_contexto(chat)

    contexto.update(nuevos_datos)

    guardar_contexto(
        chat,
        contexto
    )


def limpiar_contexto(chat):
    """
    Elimina toda la memoria del usuario.
    """

    sesion = obtener_sesion(chat.id_usuario)

    sesion.contexto_acumulado = ""

    sesion.save(
        update_fields=[
            "contexto_acumulado"
        ]
    )