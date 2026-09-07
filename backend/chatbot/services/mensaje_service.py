from chatbot.models import Mensaje
from chatbot.serializers import MensajesSerializer


class MensajeService:

    @staticmethod
    def crear_mensaje(
        chat,
        contenido,
        es_bot=False,
        tipo="texto",
        modelo=None,
        tool_ejecutada=None,
        archivo=None,
    ):
        return Mensaje.objects.create(
            id_chat=chat,
            contexto_clinico=chat.contexto_clinico_id,
            contenido=contenido,
            es_bot=es_bot,
            tipo=tipo,
            modelo=modelo,
            tool_ejecutada=tool_ejecutada,
            archivo=archivo,
        )

    @staticmethod
    def listar_mensajes(chat):
        mensajes = (
            Mensaje.objects
            .filter(id_chat=chat)
            .select_related("archivo")
            .order_by("fecha")
        )

        return MensajesSerializer(
            mensajes,
            many=True,
        ).data
