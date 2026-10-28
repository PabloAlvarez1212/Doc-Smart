import re
from difflib import SequenceMatcher
from chatbot.ai.flow_definition import FLOWS
from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.router_decision import RouterDecision
from chatbot.politicas import (
    CONFIRMACION_EXPIRA_MINUTOS,
    MAX_MOTIVO_CONSULTA,
    RESULTADOS_MAX,
    RESULTADOS_VIGENCIA_MINUTOS,
)
from chatbot.ai.filters import (
    es_consulta_estado,
    extraer_hora,
    referencia_cita_misma,
    referencia_horario_anterior,
    referencia_resultado,
    solicita_agendar_referencia,
    normalizar_intencion,
    parece_cambio_busqueda,
    parece_cambio_fecha,
    pregunta_disponibilidad,
    solicita_buscar_profesional,
    solicita_cancelar_flujo,
)
from chatbot.ai.motivos_cancelacion import normalizar_motivo_cancelacion
from datetime import timedelta
from django.utils import timezone

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

    MAX_MOTIVO = MAX_MOTIVO_CONSULTA

    @staticmethod
    def _pedir_aclaracion(medicos):
        lineas = ["No tengo claro a cuál médico te refieres. Estas son las opciones:"]
        for indice, medico in enumerate(medicos, start=1):
            lineas.append(f"{indice}. Dr(a). {medico.get('nombre')} — {medico.get('especialidad')}, {medico.get('ciudad')}")
        lineas.append("Indícame el número o el nombre.")
        return "\n".join(lineas)

    @staticmethod
    def guardar_resultados(chat, data):
        """Conserva resultados acotados y vigentes para referencias posteriores."""
        medicos = [
            {k: m.get(k) for k in ("id_medico", "nombre", "especialidad", "ciudad")}
            for m in (data.get("medicos") or [])[:RESULTADOS_MAX]
        ]
        contexto = dict(chat.contexto_temporal or {})
        if medicos:
            contexto["_resultados"] = {
                "medicos": medicos, "fecha": data.get("fecha"),
                "creado": timezone.now().isoformat(),
            }
        else:
            contexto.pop("_resultados", None)
        chat.contexto_temporal = contexto
        chat.save(update_fields=["contexto_temporal"])

    @staticmethod
    def guardar_referencia_citas(chat, codigos):
        contexto = dict(chat.contexto_temporal or {})
        contexto["_cita_ref"] = {"codigos": list(codigos)[:5], "creado": timezone.now().isoformat()}
        chat.contexto_temporal = contexto
        chat.save(update_fields=["contexto_temporal"])

    @staticmethod
    def _vigente(registro):
        try:
            creado = timezone.datetime.fromisoformat(registro["creado"])
        except (KeyError, TypeError, ValueError):
            return False
        return timezone.now() - creado <= timedelta(minutes=RESULTADOS_VIGENCIA_MINUTOS)

    @staticmethod
    def resolver_referencia(chat, mensaje):
        """«Agenda con el segundo», «con ese médico»: usa los resultados guardados.

        Solo actúa ante una petición explícita del usuario y con resultados
        vigentes. Si la referencia es ambigua, pregunta.
        """
        referencia = referencia_resultado(mensaje)
        resultados = (getattr(chat, "contexto_temporal", None) or {}).get("_resultados")
        if referencia is None or not solicita_agendar_referencia(mensaje):
            return None
        if not resultados or not FlowManager._vigente(resultados):
            return None
        medicos = resultados.get("medicos") or []
        if referencia == "unico":
            if len(medicos) != 1:
                return FlowManager._pedir_aclaracion(medicos)
            elegido = medicos[0]
        elif -len(medicos) <= referencia < len(medicos):
            elegido = medicos[referencia]
        else:
            return FlowManager._pedir_aclaracion(medicos)

        from chatbot.services.cita_service import CitaService
        fecha = CitaService.extraer_fecha_relativa(mensaje)
        parametros = {"id_medico": elegido["id_medico"]}
        if fecha is not None:
            parametros["fecha"] = timezone.localtime(fecha).strftime("%Y-%m-%d %H:%M")
        elif resultados.get("fecha"):
            parametros["fecha"] = resultados["fecha"]
        return FlowManager.iniciar(chat, "agendar_cita", parametros)

    @staticmethod
    def completar_referencia_cita(chat, mensaje, flujo, parametros):
        """«Reprograma la misma cita»: recupera el código solo si es único."""
        parametros = dict(parametros or {})
        if flujo in ("cancelar_cita", "reprogramar_cita") and not parametros.get("codigo_cita") \
                and referencia_cita_misma(mensaje):
            referencia = (getattr(chat, "contexto_temporal", None) or {}).get("_cita_ref")
            if referencia and FlowManager._vigente(referencia) and len(referencia["codigos"]) == 1:
                parametros["codigo_cita"] = referencia["codigos"][0]
        return parametros

    @staticmethod
    def _aplicar_fecha(chat, fecha):
        """Actualiza la fecha conservando médico y motivo; renueva la confirmación."""
        estado = chat.estado_conversacion
        contexto = ConversationFlow.obtener(chat)
        actual = contexto.get("fecha") or contexto.get("fecha_programada")
        if actual and actual != fecha:
            memoria = dict(chat.contexto_temporal or {})
            memoria["_fecha_previa"] = actual
            chat.contexto_temporal = memoria
            chat.save(update_fields=["contexto_temporal"])
        if estado.startswith("confirmar:"):
            return FlowManager.iniciar(chat, estado.split(":", 1)[1], {**contexto, "fecha": fecha})
        ConversationFlow.guardar(chat, {"fecha": fecha})
        contexto = ConversationFlow.obtener(chat)
        flujo = FLOWS.get(estado)
        paso = FlowManager._primer_paso_faltante(flujo, contexto)
        if paso is not None:
            return paso["pregunta"]
        return RouterDecision(tool=True, tool_name=flujo["tool"], parametros=contexto)

    @staticmethod
    def _cambio_de_fecha_contextual(chat, mensaje):
        """«Mejor a las tres», «el horario anterior». Pregunta si la hora es ambigua."""
        from chatbot.services.cita_service import CitaService
        estado = chat.estado_conversacion
        if not (estado in ("agendar_cita", "reprogramar_cita") or estado.startswith("confirmar:")):
            return None
        memoria = dict(getattr(chat, "contexto_temporal", None) or {})
        contexto = ConversationFlow.obtener(chat)
        actual = contexto.get("fecha") or contexto.get("fecha_programada")

        if referencia_horario_anterior(mensaje):
            previa = memoria.get("_fecha_previa")
            return {"fecha": previa} if previa and previa != actual else None

        if not actual or CitaService.normalizar_fecha(actual) is None:
            return None

        texto = normalizar_intencion(mensaje)
        pendiente = memoria.get("_hora_ambigua")
        if pendiente and re.fullmatch(r"(de la )?(manana|tarde|noche)|am|pm", texto):
            tarde = texto in ("tarde", "noche", "de la tarde", "de la noche", "pm")
            hora = pendiente["hora"] % 12 + (12 if tarde else 0)
            minuto = pendiente["minuto"]
        else:
            # «11 de la mañana» es una hora, no «mañana» (el día siguiente).
            texto = re.sub(r"\bde la manana\b", "", texto)
            if not parece_cambio_fecha(mensaje) or re.search(
                r"\b(manana|hoy|pasado|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b|\d{4}-\d|\d/\d|\bde (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b",
                texto,
            ):
                return None
            hora = extraer_hora(mensaje)
            if hora is None:
                return None
            if hora[0] == "ambigua":
                memoria["_hora_ambigua"] = {"hora": hora[1], "minuto": hora[2]}
                chat.contexto_temporal = memoria
                chat.save(update_fields=["contexto_temporal"])
                return f"¿Te refieres a las {hora[1]}:{hora[2]:02d} de la mañana o de la tarde?"
            hora, minuto = hora

        memoria.pop("_hora_ambigua", None)
        chat.contexto_temporal = memoria
        chat.save(update_fields=["contexto_temporal"])
        nuevo = timezone.localtime(CitaService.normalizar_fecha(actual)).replace(
            hour=hora, minute=minuto, second=0, microsecond=0)
        return {"fecha": nuevo.strftime("%Y-%m-%d %H:%M")}

    @staticmethod
    def campo_libre_pendiente(chat):
        """Campo de texto libre que el flujo activo espera, si lo hay.

        Esa respuesta pertenece al flujo aunque mencione síntomas.
        """
        estado = getattr(chat, "estado_conversacion", "normal")
        flujo = FLOWS.get(estado)
        if flujo is None:
            return None
        contexto = {
            k: v for k, v in (getattr(chat, "contexto_temporal", None) or {}).items()
            if not k.startswith("_")
        }
        paso = FlowManager._primer_paso_faltante(flujo, contexto)
        if paso is None:
            return None
        if estado == "agendar_cita" and paso["campo"] == "motivo_consulta":
            return "motivo_consulta"
        if estado == "cancelar_cita" and paso["campo"] == "motivo_cancelacion":
            return "motivo_cancelacion"
        return None

    @staticmethod
    def _describir_busqueda(contexto):
        partes = []
        if contexto.get("especialidad"):
            partes.append(str(contexto["especialidad"]))
        if contexto.get("ciudad"):
            partes.append(f"en {contexto['ciudad']}")
        fecha = None
        if contexto.get("fecha") or contexto.get("fecha_programada"):
            from chatbot.services.cita_service import CitaService
            fecha = CitaService.normalizar_fecha(
                contexto.get("fecha") or contexto.get("fecha_programada")
            )
        if fecha is not None:
            partes.append(
                "para el " + timezone.localtime(fecha).strftime("%d/%m/%Y a las %H:%M")
            )
        return " ".join(partes)

    @staticmethod
    def _resumen_estado(chat):
        """Recupera la operación pendiente sin reiniciarla ni repetir datos válidos."""
        estado = chat.estado_conversacion
        contexto = ConversationFlow.obtener(chat)

        if estado.startswith("seleccionar_medico:"):
            opciones = contexto.get("medicos") or []
            if not opciones:
                return None
            lineas = ["Sigo con tu solicitud. Estas son las opciones disponibles:"]
            for indice, opcion in enumerate(opciones, start=1):
                lineas.append(
                    f"{indice}. Dr(a). {opcion.get('nombre')} — "
                    f"{opcion.get('especialidad')}, {opcion.get('ciudad')}"
                )
            lineas.append("Indícame el nombre o el número del médico que prefieres.")
            return "\n".join(lineas)

        if estado.startswith("confirmar:"):
            if not contexto.get("id_medico"):
                return None
            from chatbot.services.medico_service import MedicoService
            medico = MedicoService.obtener_por_id(contexto["id_medico"])
            datos = FlowManager._describir_busqueda({"fecha": contexto.get("fecha")})
            motivo = contexto.get("motivo_consulta")
            quien = f"el Dr. {medico.nombre} {medico.apellido}" if medico else "el médico elegido"
            return (
                f"Tengo una operación pendiente de confirmar: cita con {quien} {datos}."
                + (f" Motivo: {motivo}." if motivo else "")
                + " Responde «sí» para confirmar o «no» para cancelar."
            )

        flujo = FLOWS.get(estado)
        if flujo is None:
            return None
        paso = FlowManager._primer_paso_faltante(flujo, contexto)
        if paso is None:
            return None
        datos = FlowManager._describir_busqueda(contexto)
        if paso["campo"] == "motivo_consulta":
            return (
                f"Ya tengo los datos de tu búsqueda ({datos}). "
                "Para continuar con la cita solo me falta el motivo de tu consulta. "
                "¿Cuál es?"
            )
        return f"Sigo con tu solicitud. Aún me falta un dato. {paso['pregunta']}"

    @staticmethod
    def resolver_busqueda(chat, mensaje):
        """Búsqueda o disponibilidad de médicos registrados, sin crear citas.

        Solo aplica sin operación pendiente. Devuelve una RouterDecision que
        ejecuta ``buscar_medico`` con los datos conservados, o None.
        """
        from chatbot.ai.router import PATRON_SOLICITUD_CITA
        from chatbot.services.cita_service import CitaService
        from chatbot.services.medico_service import MedicoService

        if PATRON_SOLICITUD_CITA.search(mensaje):
            return None

        ultima = (getattr(chat, "contexto_temporal", None) or {}).get("_ultima_cita") or {}
        previos = {
            clave: ultima[clave] for clave in ("especialidad", "ciudad") if ultima.get(clave)
        }
        busca = solicita_buscar_profesional(mensaje)
        fecha = CitaService.extraer_fecha_relativa(mensaje)

        if busca:
            parametros = MedicoService.extraer_criterios(mensaje)
            if not parametros and previos and (fecha is not None or pregunta_disponibilidad(mensaje)):
                parametros = dict(previos)
            if not parametros:
                return None
            if fecha is not None:
                parametros["fecha"] = timezone.localtime(fecha).strftime("%Y-%m-%d %H:%M")
            return RouterDecision(tool=True, tool_name="buscar_medico", parametros=parametros)

        if previos and fecha is not None and pregunta_disponibilidad(mensaje):
            parametros = {**previos, **MedicoService.extraer_criterios(mensaje)}
            parametros["fecha"] = timezone.localtime(fecha).strftime("%Y-%m-%d %H:%M")
            return RouterDecision(tool=True, tool_name="buscar_medico", parametros=parametros)

        if es_consulta_estado(mensaje) and ultima.get("especialidad"):
            parametros = {
                clave: ultima[clave]
                for clave in ("especialidad", "ciudad", "fecha")
                if ultima.get(clave)
            }
            return RouterDecision(tool=True, tool_name="buscar_medico", parametros=parametros)

        return None

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

        return RouterDecision(
            tool=True,
            tool_name=flujo["tool"],
            parametros=contexto,
        )

    @staticmethod
    def _extraer_codigo_cita(mensaje):
        texto = str(mensaje or "")
        coincidencia = re.search(
            r"(?<![A-Z0-9])DOC-[A-Z0-9]{8}(?![A-Z0-9])",
            texto,
            re.IGNORECASE
        )
        if not coincidencia:
            return None

        return coincidencia.group(0).upper()

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

            if contexto.get("codigo_cita"):
                parametros["codigo_cita"] = contexto["codigo_cita"]

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
        cambio = FlowManager._cambio_de_fecha_contextual(chat, mensaje)
        if isinstance(cambio, str):
            return cambio
        if cambio:
            return FlowManager._aplicar_fecha(chat, cambio["fecha"])

        if es_consulta_estado(mensaje):
            resumen = FlowManager._resumen_estado(chat)
            if resumen:
                return resumen

        if (
            FlowManager.campo_libre_pendiente(chat) == "motivo_consulta"
            and len(str(mensaje or "").strip()) > FlowManager.MAX_MOTIVO
        ):
            return (
                "El motivo de consulta no puede superar "
                f"{FlowManager.MAX_MOTIVO} caracteres. Resúmelo, por favor."
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

        if chat.estado_conversacion in {'cancelar_cita', 'reprogramar_cita'}:
            codigo = FlowManager._extraer_codigo_cita(mensaje)
            if codigo is not None:
                ConversationFlow.guardar(chat, {'codigo_cita': codigo})
                contexto = ConversationFlow.obtener(chat)

        paso = FlowManager._primer_paso_faltante(flujo, contexto)

        respuesta = mensaje.strip().lower().rstrip('.!?')
        if paso is not None or (FlowManager._extraer_codigo_cita(mensaje) is None
                                and respuesta not in FlowManager.RESPUESTAS_AFIRMATIVAS):
            parametros = FlowManager._extraer_seguimiento(chat, mensaje, chat.estado_conversacion, contexto)
            if not parametros and paso is not None:
                return paso['pregunta']
            if parametros:
                ConversationFlow.guardar(chat, parametros)
                contexto = ConversationFlow.obtener(chat)

        paso = FlowManager._primer_paso_faltante(flujo, contexto)

        if paso is not None:
            return paso["pregunta"]

        return RouterDecision(
            tool=True,
            tool_name=flujo["tool"],
            parametros=contexto,
        )

    @staticmethod
    def _primer_paso_faltante(flujo, contexto):
        for paso in flujo["pasos"]:

            if paso["campo"] == "motivo_cancelacion":
                motivo = normalizar_motivo_cancelacion(
                    contexto.get("motivo_cancelacion")
                )
                if motivo is None:
                    return paso

            if paso["campo"] == "codigo_cita":
                codigo = contexto.get("codigo_cita")
                if(
                    not isinstance(codigo, str)
                    or not re.fullmatch(
                        r"DOC-[A-Z0-98]{8}",
                        codigo.strip(),
                        re.IGNORECASE
                    )
                ):
                    return paso

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
        
        if (accion == "agendar_cita"and chat.estado_conversacion == "agendar_cita"):
            paso = FlowManager._primer_paso_faltante(
                FLOWS["agendar_cita"], contexto
            )

            if paso and paso["campo"] == "motivo_consulta" and not (
                parece_cambio_fecha(mensaje) or parece_cambio_busqueda(mensaje)
            ):
                from chatbot.ai.router import PATRON_CONSULTA_MEDICA
                motivo = str(mensaje or "").strip()
                respuesta = normalizar_intencion(motivo)
                # Una pregunta sin síntomas no describe el motivo.
                if "?" in motivo and not PATRON_CONSULTA_MEDICA.search(motivo):
                    return {}

                respuestas_control = {
                    normalizar_intencion(valor)
                    for valor in (
                        FlowManager.RESPUESTAS_AFIRMATIVAS
                        | FlowManager.RESPUESTAS_NEGATIVAS
                    )
                }

                if (
                    1 <= len(motivo) <= FlowManager.MAX_MOTIVO
                    and respuesta not in respuestas_control
                    and not solicita_cancelar_flujo(mensaje)
                ):
                    return {"motivo_consulta": motivo}

                return {}
            
        if accion == "cancelar_cita":
            codigo = contexto.get("codigo_cita")
            motivo_actual = normalizar_motivo_cancelacion(
                contexto.get("motivo_cancelacion")
            )
            if codigo and motivo_actual is None:
                # Si el usuario todavía proporciona un código,
                # dejamos que lo procese el extractor de códigos.
                if FlowManager._extraer_codigo_cita(mensaje) is None:
                    motivo = normalizar_motivo_cancelacion(mensaje)
                    if motivo is not None:
                        return {
                            "motivo_cancelacion": motivo
                        }
                    return {}

        if accion in {"cancelar_cita", "reprogramar_cita"}:
            codigo = FlowManager._extraer_codigo_cita(mensaje)
            if codigo is not None:
                return {"codigo_cita": codigo}

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
        if tool_name == "cancelar_cita":
            contexto = dict(chat.contexto_temporal or {})
            contexto["_cancelacion_autorizada"] = {
                "codigo_cita": parametros.get("codigo_cita"),
                "motivo_cancelacion": parametros.get("motivo_cancelacion"),
                "expira_en": (
                    timezone.now() + timedelta(minutes=CONFIRMACION_EXPIRA_MINUTOS)
                ).timestamp(),
            }
            chat.contexto_temporal = contexto
            chat.save(
                update_fields=["contexto_temporal"]
            )

        elif tool_name in ('agendar_cita', 'reprogramar_cita'):
            contexto = dict(chat.contexto_temporal or {})
            contexto['_operacion_autorizada'] = {
                'tool_name': tool_name,
                'parametros': {k: v for k, v in parametros.items() if k != 'confirmado'},
                'expira_en': (timezone.now() + timedelta(minutes=CONFIRMACION_EXPIRA_MINUTOS)).timestamp(),
            }
            chat.contexto_temporal = contexto
            chat.save(update_fields=['contexto_temporal'])

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
            referencia = referencia_resultado(mensaje)
            if referencia == "unico" and len(opciones) == 1:
                seleccion = opciones[0]
            elif isinstance(referencia, int) and -len(opciones) <= referencia < len(opciones):
                seleccion = opciones[referencia]
            elif referencia is not None:
                return FlowManager._pedir_aclaracion(opciones)

        if seleccion is None:
            return "No reconocí la opción. Indícame el número o el nombre del médico."

        tool_name = chat.estado_conversacion.split(":", 1)[1]
        parametros = {
            "id_medico": seleccion["id_medico"],
            "fecha": contexto.get("fecha"),
        }

        if tool_name == "agendar_cita":
            parametros["motivo_consulta"] = contexto.get("motivo_consulta")

            return FlowManager.iniciar(
                chat, tool_name, parametros
            )

        if not parametros["fecha"]:
            return FlowManager.iniciar(
                chat, tool_name, parametros
            )

        ConversationFlow.finalizar(chat)

        return RouterDecision(
            tool=True,
            tool_name=tool_name,
            parametros=parametros,
        )