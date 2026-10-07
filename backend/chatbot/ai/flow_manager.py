import re
from difflib import SequenceMatcher
from chatbot.ai.flow_definition import FLOWS
from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.router_decision import RouterDecision
from chatbot.ai.filters import normalizar_intencion, solicita_cancelar_flujo

class FlowManager:

    RESPUESTAS_AFIRMATIVAS = {
        "si",
        "sí",
        "confirmo",
        "acepto",
        "de acuerdo",
        "yes",
        "confirm",
    }

    RESPUESTAS_NEGATIVAS = {
        "no",
        "cancelar",
        "cancela",
        "no confirmo",
    }

    @staticmethod
    def iniciar(chat, nombre_flujo, parametros=None):

        flujo = FLOWS.get(nombre_flujo)

        if flujo is None:
            return None

        ConversationFlow.iniciar(chat, nombre_flujo)

        parametros = {
            clave: valor
            for clave, valor in (parametros or {}).items()
            if valor not in (None, "", [], {})
        }

        if parametros:
            ConversationFlow.guardar(chat, parametros)

        contexto = ConversationFlow.obtener(chat)
        paso = FlowManager._primer_paso_faltante(flujo, contexto)

        if paso is not None:
            return paso["pregunta"]

        ConversationFlow.finalizar(chat)
        return RouterDecision(
            tool=True,
            tool_name=flujo["tool"],
            parametros=contexto,
        )

    @staticmethod
    def _extraer_id_cita(mensaje, permitir_numero=False):
        original = str(mensaje or "")

        # Evita interpretar fechas, horas y números negativos como IDs.
        if re.search(r"[-/:]|\d\s*[.,]\s*\d", original):
            return None

        texto = " ".join(normalizar_intencion(original).split())

        patrones = [
            (
                r"(?:la\s+)?cita(?:\s+es)?(?:\s+la)?"
                r"(?:\s+(?:numero|nro|num))?\s+(\d+)"
            ),
            r"(?:la\s+)?(?:numero|nro|num)\s+(\d+)",
        ]

        if permitir_numero:
            patrones.append(r"(\d+)")

        for patron in patrones:
            coincidencia = re.fullmatch(patron, texto)

            if coincidencia:
                numero = int(coincidencia.group(1))
                return numero if numero > 0 else None

        return None    

    @staticmethod
    def continuar(chat, mensaje):

        accion_actual = chat.estado_conversacion.split(":")[-1]
        texto = " ".join(normalizar_intencion(mensaje).split())
        nueva_accion = None

        if accion_actual in {"cancelar_cita", "reprogramar_cita"}:
            if (
                re.search(r"\breprogram(?:ar|ala|arla|a|ame)\b", texto)
                and not re.search(
                    r"\bno\s+(?:(?:la|lo)\s+)?"
                    r"(?:quiero\s+)?reprogram\w*\b",
                    texto,
                )
            ):
                nueva_accion = "reprogramar_cita"

            elif (
                re.search(r"\bcancel(?:ar|ala|arla|a|ame)\b", texto)
                and not solicita_cancelar_flujo(mensaje)
                and not re.search(
                    r"\bno\s+(?:(?:la|lo)\s+)?"
                    r"(?:quiero\s+)?cancel\w*\b",
                    texto,
                )
            ):
                nueva_accion = "cancelar_cita"

        if nueva_accion and nueva_accion != accion_actual:
            contexto = ConversationFlow.obtener(chat)
            parametros = {}

            if contexto.get("id_cita"):
                parametros["id_cita"] = contexto["id_cita"]

            parametros.update(
                FlowManager._extraer_seguimiento(
                    chat,
                    mensaje,
                    nueva_accion,
                    parametros,
                )
            )

            return FlowManager.iniciar(
                chat,
                nueva_accion,
                parametros,
            )
        if chat.estado_conversacion.startswith("seleccionar_medico:"):
            return FlowManager._continuar_seleccion_medico(chat, mensaje)

        if chat.estado_conversacion.startswith("confirmar:"):
            return FlowManager._continuar_confirmacion(chat, mensaje)

        if solicita_cancelar_flujo(mensaje):
            ConversationFlow.finalizar(chat)
            return "Entendido. Cancelé la operación actual y no hice cambios."

        flujo = FLOWS.get(chat.estado_conversacion)

        if flujo is None:
            return None

        contexto = ConversationFlow.obtener(chat)

        paso = FlowManager._primer_paso_faltante(flujo, contexto)

        if paso is not None:
            parametros = FlowManager._extraer_seguimiento(chat, mensaje, chat.estado_conversacion, contexto)
            if not parametros:
                return paso['pregunta']
            ConversationFlow.guardar(chat, parametros)
            contexto = ConversationFlow.obtener(chat)

        paso = FlowManager._primer_paso_faltante(flujo, contexto)

        if paso is not None:
            return paso["pregunta"]

        ConversationFlow.finalizar(chat)

        return RouterDecision(
            tool=True,
            tool_name=flujo["tool"],
            parametros=contexto,
        )

    @staticmethod
    def _primer_paso_faltante(flujo, contexto):

        for paso in flujo["pasos"]:
            alternativas = paso.get("alternativas", [paso["campo"]])

            if not any(
                contexto.get(campo) not in (None, "", [], {})
                for campo in alternativas
            ):
                return paso

            if paso['campo'] == 'fecha':
                from chatbot.services.cita_service import CitaService
                fecha = contexto.get('fecha') or contexto.get('fecha_programada')
                if CitaService.normalizar_fecha(fecha) is None:
                    return {**paso, 'pregunta': '¿Qué hora prefieres para esa fecha?' if fecha else paso['pregunta']}

        return None

    @staticmethod
    def _extraer_seguimiento(chat, mensaje, accion, contexto):

        if accion in {"cancelar_cita", "reprogramar_cita"}:
            id_cita = FlowManager._extraer_id_cita(
                mensaje,
                permitir_numero=not contexto.get("id_cita"),
            )

            if id_cita is not None:
                return {"id_cita": id_cita}
            
        from chatbot.ai.router import procesar_mensaje
        from chatbot.ai.memory import construir_historial
        historial = construir_historial(chat) if getattr(chat, 'pk', None) else []
        historial.append({'role': 'user', 'parts': [{'text': (
            f'Datos de la operación pendiente {accion}: {contexto}. '
            'Extrae únicamente los campos que aporta el siguiente mensaje y conserva los restantes. '
            'No hay consentimiento para ejecutar todavía.'
        )}]})
        decision = procesar_mensaje(historial, mensaje)
        nombre = decision.tool_name if decision.usa_tool else decision.iniciar_flujo
        if nombre != accion:
            return {}
        return {k: v for k, v in (decision.parametros or {}).items() if k != 'confirmado' and v not in (None, '')}

    @staticmethod
    def _continuar_confirmacion(chat, mensaje):

        respuesta = mensaje.strip().lower().rstrip(".!?")

        if respuesta in FlowManager.RESPUESTAS_NEGATIVAS:
            ConversationFlow.finalizar(chat)
            return "Entendido. La operación fue cancelada y no hice cambios."

        if respuesta not in FlowManager.RESPUESTAS_AFIRMATIVAS:
            contexto = ConversationFlow.obtener(chat)
            accion = chat.estado_conversacion.split(':', 1)[1]
            parametros = FlowManager._extraer_seguimiento(chat, mensaje, accion, contexto)
            if parametros:
                return FlowManager.iniciar(chat, accion, {**contexto, **parametros})
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

    @staticmethod
    def _continuar_seleccion_medico(chat, mensaje):

        contexto = ConversationFlow.obtener(chat)
        opciones = contexto.get("medicos", [])
        seleccion = None
        texto = normalizar_intencion(mensaje)

        if texto.isdigit():
            indice = int(texto) - 1
            if 0 <= indice < len(opciones):
                seleccion = opciones[indice]

        if seleccion is None and texto:
            puntuados = sorted(
                (
                    (
                        SequenceMatcher(
                            None,
                            texto,
                            normalizar_intencion(opcion.get("nombre", "")),
                        ).ratio(),
                        opcion,
                    )
                    for opcion in opciones
                ),
                key=lambda elemento: elemento[0],
                reverse=True,
            )

            if puntuados and puntuados[0][0] >= 0.55:
                seleccion = puntuados[0][1]

        if seleccion is None:
            return "No reconocí la opción. Indícame el número o el nombre del médico."

        tool_name = chat.estado_conversacion.split(":", 1)[1]
        parametros = {
            "id_medico": seleccion["id_medico"],
            "fecha": contexto.get("fecha"),
        }

        if not parametros['fecha']:
            return FlowManager.iniciar(chat, tool_name, parametros)

        ConversationFlow.finalizar(chat)

        return RouterDecision(
            tool=True,
            tool_name=tool_name,
            parametros=parametros,
        )
