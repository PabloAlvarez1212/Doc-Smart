from chatbot.models import Chat, Mensaje
from chatbot.serializers import ChatSerializer , MensajesSerializer

def crearChatService(id_usuario):
    chat = Chat.objects.create(id_usuario_id=id_usuario)
    serializer = ChatSerializer(chat)
    return serializer.data, 201

def listarChatsService(id_usuario):
    chats = Chat.objects.filter(id_usuario=id_usuario)
    serializer = ChatSerializer(chats, many=True)
    return serializer.data, 200

def crearMensajeService(id_chat, contenido, es_bot=False):
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
    chat = Chat.objects.filter(id=id_chat).first()
    if not chat:
        return 'Chat no encontrado', 404
    mensajes = Mensaje.objects.filter(id_chat=id_chat)
    serializer = MensajesSerializer(mensajes, many=True)
    return serializer.data, 200

def eliminarChatService(id_chat):
    chat = Chat.objects.filter(id=id_chat).first()
    if not chat:
        return 'Chat no encontrado', 404
    chat.delete()
    return 'Chat eliminado correctamente', 200