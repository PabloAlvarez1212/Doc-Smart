from chatbot.models import Chat, Mensaje
from chatbot.serializers import ChatSerializer, MensajesSerializer


def crearChatService(id_usuario):
    """
    Crea un nuevo chat asociado a un usuario.
    Retorna (data_serializada, 201) al crearse correctamente.
    """
    chat = Chat.objects.create(id_usuario_id=id_usuario)
    serializer = ChatSerializer(chat)
    return serializer.data, 201


def listarChatsService(id_usuario):
    """
    Lista todos los chats pertenecientes a un usuario.
    Retorna (lista_serializada, 200).
    """
    chats = Chat.objects.filter(id_usuario=id_usuario)
    serializer = ChatSerializer(chats, many=True)
    return serializer.data, 200


def crearMensajeService(id_chat, contenido, es_bot=False):
    """
    Crea un nuevo mensaje dentro de un chat existente.
    - es_bot: indica si el mensaje lo envía el bot (False por defecto = usuario).
    Retorna (data_serializada, 201) si el chat existe,
    o ('Chat no encontrado', 404) si no se encuentra.
    """
    # Verificar que el chat exista antes de crear el mensaje
    chat = Chat.objects.filter(id=id_chat).first()
    if not chat:
        return 'Chat no encontrado', 404

    mensaje = Mensaje.objects.create(
        id_chat=chat,
        contenido=contenido,
        es_bot=es_bot
    )
    serializer = MensajesSerializer(mensaje)
    return serializer.data, 201


def listarMensajesService(id_chat):
    """
    Lista todos los mensajes de un chat específico.
    Retorna (lista_serializada, 200) si el chat existe,
    o ('Chat no encontrado', 404) si no se encuentra.
    """
    # Verificar que el chat exista antes de listar sus mensajes
    chat = Chat.objects.filter(id=id_chat).first()
    if not chat:
        return 'Chat no encontrado', 404

    mensajes = Mensaje.objects.filter(id_chat=id_chat)
    serializer = MensajesSerializer(mensajes, many=True)
    return serializer.data, 200


def eliminarChatService(id_chat):
    """
    Elimina un chat y todos sus mensajes asociados.
    Retorna ('Chat eliminado correctamente', 200) si existe,
    o ('Chat no encontrado', 404) si no se encuentra.
    """
    # Verificar que el chat exista antes de intentar eliminarlo
    chat = Chat.objects.filter(id=id_chat).first()
    if not chat:
        return 'Chat no encontrado', 404

    chat.delete()
    return 'Chat eliminado correctamente', 200