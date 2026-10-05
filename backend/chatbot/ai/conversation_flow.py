class ConversationFlow:
    """
    Administra el estado conversacional de un Chat.
    """

    @staticmethod
    def iniciar(chat, accion):

        chat.estado_conversacion = accion
        chat.contexto_temporal = {k: v for k, v in (chat.contexto_temporal or {}).items() if k.startswith('_')}

        chat.save(
            update_fields=[
                "estado_conversacion",
                "contexto_temporal",
            ]
        )

    @staticmethod
    def guardar(chat, datos):

        contexto = chat.contexto_temporal or {}

        contexto.update(datos)

        chat.contexto_temporal = contexto

        chat.save(update_fields=["contexto_temporal"])

    @staticmethod
    def obtener(chat):

        return {k: v for k, v in (chat.contexto_temporal or {}).items() if not k.startswith('_')}

    @staticmethod
    def finalizar(chat):

        chat.estado_conversacion = "normal"

        chat.contexto_temporal = {k: v for k, v in (chat.contexto_temporal or {}).items() if k.startswith('_')}

        chat.save(
            update_fields=[
                "estado_conversacion",
                "contexto_temporal",
            ]
        )
