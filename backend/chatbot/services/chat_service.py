from chatbot.models import Chat
from chatbot.serializers import ChatSerializer
from medicos.models import Medico
from users.models import Usuario

class ChatService:

    @staticmethod
    def filtro_propietario(usuario):
        if isinstance(usuario, Medico):
            return {"id_medico": usuario, "id_usuario__isnull": True}
        if isinstance(usuario, Usuario):
            return {"id_usuario": usuario, "id_medico__isnull": True}
        # Fail closed for unsupported authenticated principals.
        return {"pk__in": []}

    @staticmethod
    def crear_chat(usuario):
        if not isinstance(usuario, (Medico, Usuario)):
            raise ValueError("Tipo de cuenta no permitido")
        propietario = {"id_medico": usuario} if isinstance(usuario, Medico) else {"id_usuario": usuario}
        chat = Chat.objects.create(**propietario)
        return ChatSerializer(chat).data

    @staticmethod
    def listar_chats(usuario):
        chats = (
            Chat.objects
            .filter(**ChatService.filtro_propietario(usuario), estado="activo")
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
            .filter(id=id_chat, **ChatService.filtro_propietario(usuario), estado="activo")
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
