from chatbot.ai.flow_definition import FLOWS
from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.router_decision import RouterDecision

class FlowManager:

    RESPUESTAS_AFIRMATIVAS = {
        "si",
        "sí",
        "confirmo",
        "acepto",
        "de acuerdo",
    }

    RESPUESTAS_NEGATIVAS = {
        "no",
        "cancelar",
        "cancela",
        "no confirmo",
    }

    @staticmethod
    def iniciar(chat, nombre_flujo):

        flujo = FLOWS.get(nombre_flujo)

        if flujo is None:
            return None

        ConversationFlow.iniciar(chat, nombre_flujo)
        return flujo["pasos"][0]["pregunta"]

    @staticmethod
    def continuar(chat, mensaje):

        if chat.estado_conversacion.startswith("confirmar:"):
            return FlowManager._continuar_confirmacion(chat, mensaje)

        flujo = FLOWS.get(chat.estado_conversacion)

        if flujo is None:
            return None

        contexto = ConversationFlow.obtener(chat)

        for paso in flujo["pasos"]:

            campo = paso["campo"]

            if campo not in contexto:

                ConversationFlow.guardar(
                    chat,
                    {
                        campo: mensaje
                    }
                )

                contexto = ConversationFlow.obtener(chat)

                break

        for paso in flujo["pasos"]:

            if paso["campo"] not in contexto:

                return paso["pregunta"]

        ConversationFlow.finalizar(chat)

        return RouterDecision(
            tool=True,
            tool_name=flujo["tool"],
            parametros=contexto,
        )

    @staticmethod
    def _continuar_confirmacion(chat, mensaje):

        respuesta = mensaje.strip().lower().rstrip(".!?")

        if respuesta in FlowManager.RESPUESTAS_NEGATIVAS:
            ConversationFlow.finalizar(chat)
            return "Entendido. La operación fue cancelada y no hice cambios."

        if respuesta not in FlowManager.RESPUESTAS_AFIRMATIVAS:
            return "Por seguridad, responde «sí» para confirmar o «no» para cancelar."

        tool_name = chat.estado_conversacion.split(":", 1)[1]
        parametros = ConversationFlow.obtener(chat)
        parametros["confirmado"] = True

        ConversationFlow.finalizar(chat)

        return RouterDecision(
            tool=True,
            tool_name=tool_name,
            parametros=parametros,
        )
