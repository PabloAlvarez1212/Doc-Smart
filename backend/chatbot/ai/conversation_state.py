class ConversationState:
    """
    Estado temporal de una conversación durante el procesamiento
    de un mensaje.
    """

    def __init__(self):

        # Mensaje recibido del usuario
        self.mensaje = ""

        # Historial enviado a Gemini
        self.historial = []

        # Contexto permanente del usuario
        self.contexto = {}

        # Decisión tomada por el router
        self.decision = None

        # Resultado de la Tool (si se ejecutó)
        self.tool_result = None

        # Respuesta final que recibirá el usuario
        self.respuesta = None

    @property
    def usa_tool(self):
        return (
            self.decision is not None
            and self.decision.tool
        )