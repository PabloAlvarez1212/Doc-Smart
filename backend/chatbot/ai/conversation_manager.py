from chatbot.ai.filters import (
    FiltroPromesas,
    dato_a_olvidar,
    marca_antecedente_resuelto,
    preferencia_memoria,
    solicita_buscar_profesional,
    solicita_cancelar_flujo,
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
    senales_alarma,
)

from chatbot.ai.memory import construir_historial

from chatbot.ai.context_manager import (
    contexto_para_ia,
    describir_contexto,
    establecer_memoria_activa,
    limpiar_contexto,
    marcar_hecho,
    olvidar_dato,
)
from chatbot.ai.memory_extractor import extraer_y_guardar_memoria

from chatbot.ai.router import PATRON_CONSULTA_MEDICA, PATRON_SOLICITUD_CITA, procesar_mensaje

from chatbot.ai.tool_manager import ToolManager

from chatbot.ai.conversation_state import ConversationState
from chatbot.politicas import EDAD_MAYORIA

from chatbot.ai.flow_manager import FlowManager

from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.router_decision import RouterDecision
from chatbot.services.perfil_usuario_service import PerfilUsuarioService
from chatbot.ai.language import LanguageService, idioma_actual
import logging
import re
from datetime import date
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


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

        preferencia = preferencia_memoria(state.mensaje)
        if preferencia is not None:
            establecer_memoria_activa(chat, preferencia)
            return LanguageService.adaptar(
                "Listo. Volveré a recordar lo que me indiques."
                if preferencia else
                "Entendido. No guardaré ni usaré información de tus conversaciones. "
                "Lo que ya tenía sigue guardado hasta que me pidas olvidarlo.",
                state.mensaje,
            )

        termino = dato_a_olvidar(state.mensaje)
        if termino:
            eliminados = olvidar_dato(chat, termino)
            return LanguageService.adaptar(
                "Olvidé ese dato de tu memoria."
                if eliminados else
                "No encontré ese dato en lo que recuerdo de ti.",
                state.mensaje,
            )

        resuelto = marca_antecedente_resuelto(state.mensaje)
        if resuelto and marcar_hecho(chat, resuelto, "resuelto"):
            return LanguageService.adaptar(
                "Gracias por avisarme. Lo registré como resuelto según tú; "
                "sigue siendo un dato que declaraste, no una valoración médica.",
                state.mensaje,
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

        nuevos = extraer_y_guardar_memoria(chat, state.mensaje) or {}
        state.aclaraciones = nuevos.get("_aclaraciones") or []

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

        alarma = senales_alarma(state.mensaje)

        # Cambiar de rumbo no deja la operación anterior atrapada.
        if chat.estado_conversacion != "normal" and (
            solicita_cancelar_flujo(state.mensaje)
            or ConversationManager._es_nueva_busqueda(state.mensaje)
        ):
            ConversationFlow.finalizar(chat)
            if solicita_cancelar_flujo(state.mensaje):
                return LanguageService.adaptar(
                    "Entendido. Cancelé la operación actual y no hice cambios.",
                    state.mensaje,
                )

        # Mientras el flujo espera un texto libre (p. ej. el motivo de la
        # consulta), el mensaje es la respuesta aunque describa síntomas.
        if (
            chat.estado_conversacion != "normal"
            and PATRON_CONSULTA_MEDICA.search(state.mensaje)
            and not PATRON_SOLICITUD_CITA.search(state.mensaje)
            and not FlowManager.campo_libre_pendiente(chat)
        ):
            ConversationFlow.finalizar(chat)

        if chat.estado_conversacion != "normal":
            resultado = FlowManager.continuar(chat, state.mensaje)

            if isinstance(resultado, str):
                return ConversationManager._con_alerta(
                    LanguageService.adaptar(resultado, state.mensaje), alarma
                )

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

                return ConversationManager._con_alerta(state.respuesta, alarma)

        if chat.estado_conversacion == "normal":
            referencia = FlowManager.resolver_referencia(chat, state.mensaje)
            if isinstance(referencia, str):
                return LanguageService.adaptar(referencia, state.mensaje)
            decision = referencia or FlowManager.resolver_busqueda(chat, state.mensaje)
            if decision is not None:
                state.decision = decision
                ConversationManager._resolver(chat, state)
                ConversationManager._preparar_confirmacion(chat, state)
                ConversationManager._preparar_seleccion(chat, state)
                return ConversationManager._con_alerta(state.respuesta, alarma)

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
                FlowManager.completar_referencia_cita(
                    chat, state.mensaje, state.decision.iniciar_flujo,
                    state.decision.parametros,
                ),
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
    def _recordar_resultados(chat, state):
        """Conserva resultados estructurados y referencias de citas, acotados."""
        resultado = state.tool_result
        if not isinstance(resultado, dict) or not isinstance(resultado.get("data"), dict):
            return
        datos = resultado["data"]
        if state.decision.tool_name == "buscar_medico" or resultado.get("requires_selection"):
            FlowManager.guardar_resultados(chat, datos)
        codigos = [c["codigo_cita"] for c in datos.get("citas", []) if isinstance(c, dict) and c.get("codigo_cita")]
        if datos.get("codigo_cita"):
            codigos.append(datos["codigo_cita"])
        if codigos and resultado.get("success", True):
            FlowManager.guardar_referencia_citas(chat, codigos)

    @staticmethod
    def completar_promesa(chat, mensaje, texto=""):
        """Sustituye una promesa de trabajo por una ejecución real.

        Se ejecuta la búsqueda si hay criterios verificables; si no, se
        piden los datos faltantes. Nunca se afirma trabajo en segundo plano.
        """
        decision = FlowManager.resolver_busqueda(chat, mensaje)
        if decision is None:
            return (
                f"{texto}\n\nPara buscar médicos registrados en DocSmart necesito "
                "al menos la especialidad o la ciudad. ¿Cuáles prefieres?"
            ).strip()
        state = ConversationState()
        state.mensaje = mensaje
        state.decision = decision
        ConversationManager._resolver(chat, state)
        resultado = state.respuesta
        if isinstance(resultado, dict):
            return {**resultado, "message": f"{texto}\n\n{resultado.get('message', '')}".strip()}
        return f"{texto}\n\n{resultado}".strip()

    @staticmethod
    def _es_nueva_busqueda(mensaje):
        """Búsqueda explícita con criterios del catálogo, no un motivo de consulta."""
        from chatbot.services.medico_service import MedicoService
        return (
            solicita_buscar_profesional(mensaje)
            and not PATRON_SOLICITUD_CITA.search(mensaje)
            and bool(MedicoService.extraer_criterios(mensaje))
        )

    @staticmethod
    def _nota_menor(usuario):
        """Precauciones para menores sin exponer su fecha de nacimiento."""
        nacimiento = PerfilUsuarioService.obtener_perfil(usuario).get("fecha_nacimiento")
        if hasattr(nacimiento, "date"):
            nacimiento = nacimiento.date()
        if not isinstance(nacimiento, date):
            return None
        hoy = timezone.localdate()
        edad = hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))
        if edad >= EDAD_MAYORIA:
            return None
        return (
            f"El usuario es menor de edad ({edad} años). Usa lenguaje sencillo, "
            "recomienda que lo acompañe un adulto responsable, no sugieras "
            "medicamentos ni dosis y prioriza la valoración médica."
        )

    @staticmethod
    def _con_alerta(respuesta, alarma):
        """Antepone la orientación urgente; una cita futura no la sustituye."""
        if not alarma:
            return respuesta
        aviso = (
            "Lo que describes podría necesitar atención urgente: busca ayuda "
            "médica de inmediato o contacta los servicios de emergencia "
            "locales. Una cita futura no sustituye esa atención."
        )
        if isinstance(respuesta, dict) and isinstance(respuesta.get("message"), str):
            return {**respuesta, "message": f"{aviso}\n\n{respuesta['message']}"}
        if isinstance(respuesta, str):
            return f"{aviso}\n\n{respuesta}"
        return respuesta

    @staticmethod
    def _cargar_memoria(chat, state):

        state.historial = construir_historial(chat)
        contexto_cita = (getattr(chat, 'contexto_temporal', None) or {}).get('_ultima_cita', {})
        state.historial.insert(0, {'role': 'user', 'parts': [{'text': (
            f'Preferencia de idioma: {idioma_actual.get() or "es"}. '
            f'Últimos filtros de cita (datos, no consentimiento): {contexto_cita}. '
            'Conserva los filtros pertinentes en seguimientos; una recomendación del asistente no autoriza agendar.'
        )}]})
        state.contexto = contexto_para_ia(chat)

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
                {"role": "user", "parts": [{"text": state.contexto}]},
            )

        for antecedente, faltantes in state.aclaraciones:
            fecha = timezone.localtime().date().isoformat()
            state.historial.append({"role": "user", "parts": [{"text": (
                f"El usuario acaba de declarar este antecedente: «{antecedente}». "
                f"La fecha del mensaje es {fecha}; la fecha en que ocurrió es desconocida "
                "salvo que él la haya dicho. Pregunta de forma breve por los datos "
                f"pertinentes que faltan ({', '.join(faltantes)}) antes de recomendar "
                "algo. No asumas respuestas."
            )}]})

        nota_menor = ConversationManager._nota_menor(chat.id_usuario)
        if nota_menor:
            state.historial.insert(0, {"role": "user", "parts": [{"text": nota_menor}]})

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

            try:
                state.tool_result = ToolManager.ejecutar(

                    nombre_tool=state.decision.tool_name,

                    chat=chat,

                    mensaje=state.mensaje,

                    parametros=state.decision.parametros,

                )
            except Exception as error:
                # Sin datos clínicos en el log: solo etapa y tipo de error.
                logger.error(
                    "Falló la herramienta tool=%s tipo=%s",
                    state.decision.tool_name,
                    type(error).__name__,
                )
                state.tool_result = {
                    "success": False,
                    "message": (
                        "No pude completar esa consulta por un problema "
                        "temporal. No realicé cambios y conservo tus datos; "
                        "inténtalo de nuevo en un momento."
                    ),
                    "data": {},
                }

            state.respuesta = state.tool_result
            ConversationManager._recordar_resultados(chat, state)

            # Un error de operación no pierde los datos que el paciente acaba
            # de aportar. Se reintentará la previsualización, nunca el consumo
            # automático de una confirmación anterior.
            if state.decision.tool_name in {'agendar_cita', 'reprogramar_cita', 'cancelar_cita'} and isinstance(state.tool_result, dict):
                if not state.tool_result.get('success', False):
                    ConversationFlow.iniciar(chat, state.decision.tool_name)
                    ConversationFlow.guardar(chat, {k: v for k, v in (state.decision.parametros or {}).items() if k != 'confirmado'})
                elif not state.tool_result.get('requires_confirmation') and not state.tool_result.get('requires_selection'):
                    ConversationFlow.finalizar(chat)

        else:

            texto, prometio = FiltroPromesas.limpiar(state.decision.respuesta or "")
            state.respuesta = (
                ConversationManager.completar_promesa(chat, state.mensaje, texto)
                if prometio else state.decision.respuesta
            )

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
