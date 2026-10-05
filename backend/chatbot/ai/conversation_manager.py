from chatbot.ai.filters import (
    limpiar_mensaje,
    contiene_prompt_injection,
    es_saludo,
    solicita_buscar_medicos,
    solicita_borrar_memoria,
    solicita_datos_perfil,
    solicita_fecha_nacimiento,
    solicita_edad_usuario,
    solicita_nombre_usuario,
    solicita_ver_memoria,
)

from chatbot.ai.memory import construir_historial

from chatbot.ai.context_manager import (
    describir_contexto,
    limpiar_contexto,
    obtener_contexto,
)
from chatbot.ai.memory_extractor import extraer_y_guardar_memoria

from chatbot.ai.router import PATRON_CONSULTA_MEDICA, PATRON_SOLICITUD_CITA, procesar_mensaje

from chatbot.ai.tool_manager import ToolManager

from chatbot.ai.conversation_state import ConversationState

from chatbot.ai.flow_manager import FlowManager

from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.router_decision import RouterDecision
from chatbot.services.perfil_usuario_service import PerfilUsuarioService
from chatbot.ai.language import LanguageService, idioma_actual
import re
from django.db import transaction


class ConversationManager:

    @staticmethod
    def procesar(chat, mensaje, streaming=False):

        if getattr(chat, 'id_medico_id', None):
            return ConversationManager._procesar(chat, mensaje, streaming)
        # Serializar el consumo de confirmaciones incluso entre REST y WS.
        respuesta = str(mensaje).strip().lower().rstrip('.!?')
        if respuesta in FlowManager.RESPUESTAS_AFIRMATIVAS and getattr(chat, 'pk', None):
            from chatbot.models import Chat
            with transaction.atomic():
                chat = Chat.objects.select_for_update().get(pk=chat.pk)
                return ConversationManager._procesar_localizado(chat, mensaje, streaming)
        return ConversationManager._procesar_localizado(chat, mensaje, streaming)

    @staticmethod
    def _procesar_localizado(chat, mensaje, streaming):
        contexto = getattr(chat, 'contexto_temporal', None) or {}
        idioma = contexto.get('_idioma') or LanguageService.detectar(mensaje)
        preferencia = re.search(r'(?:responde|háblame|hablame|prefiero|respond|speak|answer).*?\b(español|espanol|inglés|ingles|english|spanish|griego|greek)\b', mensaje, re.I)
        if preferencia:
            idioma = {'english': 'en', 'inglés': 'en', 'ingles': 'en', 'greek': 'el', 'griego': 'el'}.get(preferencia[1].lower(), 'es')
        if contexto.get('_idioma') != idioma:
            chat.contexto_temporal = {**contexto, '_idioma': idioma}
            chat.save(update_fields=['contexto_temporal'])
        token = idioma_actual.set(idioma)
        try:
            return ConversationManager._procesar(chat, mensaje, streaming)
        finally:
            idioma_actual.reset(token)

    @staticmethod
    def _procesar(chat, mensaje, streaming=False):

        if getattr(chat, "id_medico_id", None):
            from chatbot.ai.doctor_conversation import procesar_medico
            return procesar_medico(chat, mensaje, streaming=streaming)

        state = ConversationState()

        state.mensaje = limpiar_mensaje(mensaje)
        idioma = idioma_actual.get() or LanguageService.detectar(state.mensaje)

        if contiene_prompt_injection(state.mensaje):
            return LanguageService.adaptar(
                "No puedo procesar ese tipo de instrucciones.", state.mensaje
            )

        if solicita_borrar_memoria(state.mensaje):
            limpiar_contexto(chat)
            return LanguageService.adaptar(
                "Eliminé la información que recordaba sobre ti.", state.mensaje
            )

        if solicita_nombre_usuario(state.mensaje):
            respuesta = PerfilUsuarioService.responder_nombre(chat.id_usuario, idioma)
            perfil = PerfilUsuarioService.obtener_perfil(chat.id_usuario)
            return LanguageService.adaptar(respuesta, state.mensaje, perfil.values())

        if solicita_fecha_nacimiento(state.mensaje):
            respuesta = PerfilUsuarioService.responder_fecha_nacimiento(
                chat.id_usuario, idioma
            )
            perfil = PerfilUsuarioService.obtener_perfil(chat.id_usuario)
            return LanguageService.adaptar(respuesta, state.mensaje, perfil.values())

        if solicita_edad_usuario(state.mensaje):
            respuesta = PerfilUsuarioService.responder_edad(chat.id_usuario, idioma)
            perfil = PerfilUsuarioService.obtener_perfil(chat.id_usuario)
            return LanguageService.adaptar(respuesta, state.mensaje, perfil.values())

        if solicita_datos_perfil(state.mensaje):
            respuesta = PerfilUsuarioService.describir_perfil(chat.id_usuario, idioma)
            perfil = PerfilUsuarioService.obtener_perfil(chat.id_usuario)
            return LanguageService.adaptar(respuesta, state.mensaje, perfil.values())

        if solicita_ver_memoria(state.mensaje):
            perfil = PerfilUsuarioService.describir_perfil(chat.id_usuario, idioma)
            memoria = describir_contexto(chat, idioma)
            respuesta = f"{perfil}\n\n{memoria}"
            datos = PerfilUsuarioService.obtener_perfil(chat.id_usuario)
            return LanguageService.adaptar(respuesta, state.mensaje, datos.values())

        extraer_y_guardar_memoria(chat, state.mensaje)

        if chat.estado_conversacion == "normal" and es_saludo(state.mensaje):
            perfil = PerfilUsuarioService.obtener_perfil(chat.id_usuario)
            nombre = perfil.get("nombre")
            if idioma == "en":
                saludo = f"Hello, {nombre}!" if nombre else "Hello!"
                return f"{saludo}  I'm Bymax. How can I help you today?"
            if idioma == "el":
                saludo = f"Γεια σας, {nombre}!" if nombre else "Γεια σας!"
                return f"{saludo}  Είμαι ο Bymax. Πώς μπορώ να σας βοηθήσω σήμερα;"
            saludo = f"¡Hola, {nombre}!" if nombre else "¡Hola!"
            return f"{saludo}  Soy Bymax. ¿En qué puedo ayudarte hoy?"

        if chat.estado_conversacion == 'normal' and state.mensaje.strip().lower().rstrip('.!?') in FlowManager.RESPUESTAS_AFIRMATIVAS:
            return LanguageService.adaptar('No hay una operación pendiente de confirmación. Indícame qué deseas hacer.', state.mensaje)

        if (
            chat.estado_conversacion != "normal"
            and PATRON_CONSULTA_MEDICA.search(state.mensaje)
            and not PATRON_SOLICITUD_CITA.search(state.mensaje)
        ):
            ConversationFlow.finalizar(chat)

        if chat.estado_conversacion != "normal":
            resultado = FlowManager.continuar(chat, state.mensaje)

            if isinstance(resultado, str):
                return LanguageService.adaptar(resultado, state.mensaje)

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

                ConversationManager._preparar_seleccion(
                    chat,
                    state,
                )

                return state.respuesta

        ConversationManager._cargar_memoria(
            chat,
            state
        )

        ConversationManager._consultar_ia(state, streaming=streaming)

        # Seguridad extra
        if state.decision is None:

            return (
                "Lo siento, ocurrió un error al procesar tu solicitud."
            )

        # En modo streaming el router no genera todavía la respuesta final.
        # Devuelve los contenidos listos para que el consumer los transmita
        # progresivamente sin alterar los flujos ni las herramientas.
        if (
            streaming
            and not state.decision.usa_tool
            and not state.decision.usa_flujo
            and (state.decision.parametros or {}).get("__stream_openai__")
        ):
            return {
                "stream": True,
                "contents": (state.decision.parametros or {}).get("contents", []),
            }

        if state.decision.usa_flujo:

            resultado_flujo = FlowManager.iniciar(
                chat,
                state.decision.iniciar_flujo,
                state.decision.parametros,
            )

            if isinstance(resultado_flujo, RouterDecision):
                state.decision = resultado_flujo
                ConversationManager._resolver(chat, state)
                ConversationManager._preparar_confirmacion(chat, state)
                ConversationManager._preparar_seleccion(chat, state)
                return state.respuesta

            return LanguageService.adaptar(
                resultado_flujo or "No pude iniciar esa operación.",
                state.mensaje,
            )


        ConversationManager._resolver(
            chat,
            state
        )

        ConversationManager._preparar_confirmacion(
            chat,
            state,
        )

        ConversationManager._preparar_seleccion(
            chat,
            state,
        )

        return state.respuesta

    @staticmethod
    def _cargar_memoria(chat, state):

        state.historial = construir_historial(chat)
        contexto_cita = (getattr(chat, 'contexto_temporal', None) or {}).get('_ultima_cita', {})
        state.historial.insert(0, {'role': 'user', 'parts': [{'text': (
            f'Preferencia de idioma: {idioma_actual.get() or "es"}. '
            f'Últimos filtros de cita (datos, no consentimiento): {contexto_cita}. '
            'Conserva los filtros pertinentes en seguimientos; una recomendación del asistente no autoriza agendar.'
        )}]})
        from chatbot.services.identity_service import tono_chat
        tono = tono_chat(chat)
        if tono:
            state.historial.insert(0, {"role": "user", "parts": [{"text": tono}]})

        state.contexto = obtener_contexto(chat)

        perfil = PerfilUsuarioService.contexto_minimo_para_ia(
            chat.id_usuario
        )

        if perfil:
            state.historial.insert(
                0,
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                "Perfil autenticado del usuario en DocSmart:\n"
                                f"{perfil}"
                            )
                        }
                    ],
                },
            )

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
    def _consultar_ia(state, streaming=False):

        state.decision = procesar_mensaje(
            state.historial,
            state.mensaje,
            streaming=streaming,
        )

    @staticmethod
    def _resolver(chat, state):

        if state.decision.usa_tool:

            from chatbot.ai.flow_definition import FLOWS
            flujo = FLOWS.get(state.decision.tool_name)
            if flujo and not (state.decision.parametros or {}).get('confirmado') and FlowManager._primer_paso_faltante(flujo, state.decision.parametros or {}):
                state.respuesta = LanguageService.adaptar(FlowManager.iniciar(chat, state.decision.tool_name, state.decision.parametros), state.mensaje)
                return

            if state.decision.tool_name in {'agendar_cita', 'buscar_medico', 'reprogramar_cita', 'cancelar_cita'}:
                parametros = {k: v for k, v in (state.decision.parametros or {}).items() if k != 'confirmado'}
                if parametros:
                    contexto = getattr(chat, 'contexto_temporal', None) or {}
                    chat.contexto_temporal = {**contexto, '_ultima_cita': parametros}
                    chat.save(update_fields=['contexto_temporal'])

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

    @staticmethod
    def _preparar_seleccion(chat, state):

        resultado = state.tool_result

        if not isinstance(resultado, dict):
            return

        if not resultado.get("requires_selection"):
            return

        ConversationFlow.iniciar(
            chat,
            f"seleccionar_medico:{state.decision.tool_name}",
        )

        ConversationFlow.guardar(
            chat,
            resultado.get("data", {}),
        )
