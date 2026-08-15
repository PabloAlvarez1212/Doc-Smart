from chatbot.models import Chat
from chatbot.serializers import ChatSerializer

class ChatService:

    @staticmethod
    def crear_chat(usuario):
        chat = Chat.objects.create(id_usuario=usuario)
        return ChatSerializer(chat).data

    @staticmethod
    def listar_chats(usuario):
        chats = (
            Chat.objects
            .filter(id_usuario=usuario, estado="activo")
            .order_by("-ultima_interaccion")
        )
        return ChatSerializer(chats, many=True).data

    @staticmethod
    def obtener_chat(id_chat, usuario):
        # Se usa internamente (para validar pertenencia) y en vistas —
        # aquí sigue devolviendo el objeto modelo, NO serializado,
        # porque MensajeListView.get() y ChatbotResponderView lo necesitan
        # como instancia real de Chat para pasarlo a otros servicios.
        return (
            Chat.objects
            .filter(id=id_chat, id_usuario=usuario, estado="activo")
            .first()
        )

    @staticmethod
    def eliminar_chat(id_chat, usuario):
        chat = ChatService.obtener_chat(id_chat, usuario)
        if chat is None:
            return False
        chat.estado = "eliminado"
        chat.save()
        return True