from chatbot.ai.filters import (
    limpiar_mensaje,
    contiene_prompt_injection,
    es_saludo,
    solicita_buscar_medicos,
)

from chatbot.ai.memory import construir_historial

from chatbot.ai.context_manager import obtener_contexto

from chatbot.ai.router import procesar_mensaje

from chatbot.ai.tool_manager import ToolManager

from chatbot.ai.conversation_state import ConversationState

from chatbot.ai.flow_manager import FlowManager

from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.router_decision import RouterDecision


class ConversationManager:

    @staticmethod
    def procesar(chat, mensaje):

        state = ConversationState()

        state.mensaje = limpiar_mensaje(mensaje)

        if contiene_prompt_injection(state.mensaje):

            return "No puedo procesar ese tipo de instrucciones."

        if chat.estado_conversacion == "normal" and es_saludo(state.mensaje):
            return "¡Hola! 👋 Soy Bymax. ¿En qué puedo ayudarte hoy?"

        if solicita_buscar_medicos(state.mensaje):

            if chat.estado_conversacion != "normal":
                ConversationFlow.finalizar(chat)

            state.decision = RouterDecision(
                tool=True,
                tool_name="buscar_medico",
                parametros={},
            )

            ConversationManager._resolver(chat, state)
            return state.respuesta


        if chat.estado_conversacion != "normal":

            resultado = FlowManager.continuar(
                chat,
                state.mensaje
            )

            if isinstance(resultado, str):
                return resultado

            if resultado:

                state.decision = resultado

                ConversationManager._resolver(
                    chat,
                    state
                )

                ConversationManager._preparar_confirmacion(
                    chat,
                    state,
                )

                return state.respuesta

        ConversationManager._cargar_memoria(
            chat,
            state
        )

        ConversationManager._consultar_ia(
            state
        )

        # Seguridad extra
        if state.decision is None:

            return (
                "Lo siento, ocurrió un error al procesar tu solicitud."
            )

        if state.decision.usa_flujo:

            pregunta = FlowManager.iniciar(
                chat,
                state.decision.iniciar_flujo
            )

            return pregunta or "No pude iniciar esa operación."


        ConversationManager._resolver(
            chat,
            state
        )

        ConversationManager._preparar_confirmacion(
            chat,
            state,
        )

        return state.respuesta

    @staticmethod
    def _cargar_memoria(chat, state):

        state.historial = construir_historial(chat)

        state.contexto = obtener_contexto(chat)

        if state.contexto:

            state.historial.insert(
                0,
                {
                    "role": "user",
                    "parts": [
                        {
                            "text":
                            "Información conocida del usuario:\n"
                            f"{state.contexto}"
                        }
                    ]
                }
            )

    @staticmethod
    def _consultar_ia(state):

        state.decision = procesar_mensaje(
            state.historial,
            state.mensaje
        )

    @staticmethod
    def _resolver(chat, state):

        if state.decision.usa_tool:

            state.tool_result = ToolManager.ejecutar(

                nombre_tool=state.decision.tool_name,

                chat=chat,

                mensaje=state.mensaje,

                parametros=state.decision.parametros,

            )

            state.respuesta = state.tool_result

        else:

            state.respuesta = state.decision.respuesta

    @staticmethod
    def _preparar_confirmacion(chat, state):

        resultado = state.tool_result

        if not isinstance(resultado, dict):
            return

        if not resultado.get("requires_confirmation"):
            return

        ConversationFlow.iniciar(
            chat,
            f"confirmar:{state.decision.tool_name}",
        )

        ConversationFlow.guardar(
            chat,
            resultado.get("data", {}),
        )
