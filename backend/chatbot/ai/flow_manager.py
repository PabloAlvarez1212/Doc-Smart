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
from types import SimpleNamespace
from django.utils import timezone
from chatbot.politicas import ALTERNATIVAS_MAX

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
    def _marcar_aclarando(chat):
        """Se acaba de preguntar «¿cuál?»: la próxima referencia responde a esa pregunta."""
        memoria = dict(chat.contexto_temporal or {})
        if memoria.get("_resultados"):
            memoria["_resultados"] = {**memoria["_resultados"], "aclarando": True}
            chat.contexto_temporal = memoria
            chat.save(update_fields=["contexto_temporal"])

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
                "aclarando": bool(data.get("aclarando")),
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
    def guardar_alternativas(chat, items):
        """Horarios alternativos ofrecidos (acotados y vigentes) para elegirlos después."""
        memoria = dict(chat.contexto_temporal or {})
        if items:
            memoria["_alternativas"] = {"items": list(items)[:ALTERNATIVAS_MAX], "creado": timezone.now().isoformat()}
        else:
            memoria.pop("_alternativas", None)
        chat.contexto_temporal = memoria
        chat.save(update_fields=["contexto_temporal"])

    @staticmethod
    def _elegir_alternativa(chat, mensaje):
        """Alternativa elegida por número, orden u hora. Devuelve dict, texto de aclaración o None."""
        from chatbot.services.cita_service import CitaService
        memoria = dict(getattr(chat, "contexto_temporal", None) or {})
        registro = memoria.get("_alternativas")
        if not registro or not FlowManager._vigente(registro):
            return None
        items = registro["items"]
        texto = normalizar_intencion(mensaje)
        elegida = None
        referencia = int(texto) - 1 if texto.isdigit() else referencia_resultado(mensaje)
        if isinstance(referencia, int) and -len(items) <= referencia < len(items):
            elegida = items[referencia]
        else:
            hora = extraer_hora(mensaje)
            if hora is not None and hora[0] != "ambigua":
                dia = CitaService.extraer_dia(mensaje)
                coincidentes = []
                for item in items:
                    local = timezone.localtime(timezone.datetime.fromisoformat(item["fecha"]))
                    if (local.hour, local.minute) == tuple(hora) and (dia is None or local.date() == dia):
                        coincidentes.append(item)
                if len(coincidentes) == 1:
                    elegida = coincidentes[0]
                elif len(coincidentes) > 1:
                    lineas = ["Hay varias opciones a esa hora. ¿Cuál prefieres?"]
                    for item in coincidentes:
                        local = timezone.localtime(timezone.datetime.fromisoformat(item["fecha"]))
                        lineas.append(f"- Dr(a). {item['nombre']} — {local.strftime('%d/%m/%Y a las %H:%M')}")
                    return "\n".join(lineas)
        if elegida is not None:
            memoria.pop("_alternativas", None)
            chat.contexto_temporal = memoria
            chat.save(update_fields=["contexto_temporal"])
        return elegida

    @staticmethod
    def resolver_nombre(chat, mensaje, forzar=False):
        """«Oye Quiroz», «olí Quiroz»: candidatos por nombre, priorizando los médicos mostrados.

        Un único candidato claro se selecciona y se confirma brevemente; varios piden
        elegir entre ellos; una coincidencia débil no selecciona nada.
        """
        from chatbot.services.cita_service import CitaService
        from chatbot.services.medico_service import MedicoService
        memoria = getattr(chat, "contexto_temporal", None) or {}
        resultados = memoria.get("_resultados")
        recientes = (resultados.get("medicos") if resultados and FlowManager._vigente(resultados) else None) or []
        if not recientes and not forzar:
            return None
        if len(normalizar_intencion(mensaje).split()) > 8:
            return None
        if recientes:
            pool = [SimpleNamespace(pk=m["id_medico"], nombre=m.get("nombre", ""), apellido="") for m in recientes]
        else:
            contexto = ConversationFlow.obtener(chat)
            pool = list(MedicoService.buscar_medicos(
                especialidad=contexto.get("especialidad"),
                ciudad=None if contexto.get("ciudad_omitida") else contexto.get("ciudad"),
            )[:100])
        candidatos = MedicoService.candidatos_por_nombre(mensaje, pool, prioritarios={m.pk for m in pool})
        if not candidatos:
            return None
        if len(candidatos) > 1:
            descripciones = {m["id_medico"]: m for m in recientes}
            lineas = ["Hay varios médicos con ese nombre. ¿Cuál prefieres?"]
            for indice, medico in enumerate(candidatos[:5], start=1):
                datos = descripciones.get(medico.pk, {})
                lineas.append(f"{indice}. Dr(a). {datos.get('nombre') or (medico.nombre + ' ' + medico.apellido)} — "
                              f"{datos.get('especialidad', '')}, {datos.get('ciudad', '')}")
            FlowManager.guardar_resultados(chat, {"aclarando": True, "medicos": [
                {"id_medico": m.pk, "nombre": descripciones.get(m.pk, {}).get("nombre") or f"{m.nombre} {m.apellido}".strip(),
                 "especialidad": descripciones.get(m.pk, {}).get("especialidad", ""),
                 "ciudad": descripciones.get(m.pk, {}).get("ciudad", "")} for m in candidatos[:5]]})
            return "\n".join(lineas)
        elegido = candidatos[0]
        datos = {m["id_medico"]: m for m in recientes}.get(elegido.pk, {})
        nombre = datos.get("nombre") or f"{elegido.nombre} {elegido.apellido}".strip()
        detalle = ", ".join(p for p in (datos.get("especialidad"), datos.get("ciudad")) if p)
        prefijo = f"Seleccioné al Dr(a). {nombre}" + (f" ({detalle})." if detalle else ".")
        contexto = ConversationFlow.obtener(chat)
        parametros = {**{k: contexto[k] for k in ("especialidad", "ciudad", "fecha", "fecha_dia", "motivo_consulta")
                         if contexto.get(k)}, "id_medico": elegido.pk}
        fecha = CitaService.extraer_fecha_relativa(mensaje)
        if fecha is not None:
            parametros["fecha"] = timezone.localtime(fecha).strftime("%Y-%m-%d %H:%M")
        elif CitaService.extraer_dia(mensaje) is not None:
            parametros["fecha_dia"] = CitaService.extraer_dia(mensaje).isoformat()
        elif not parametros.get("fecha") and resultados and resultados.get("fecha"):
            parametros["fecha"] = resultados["fecha"]
        return FlowManager._con_prefijo(FlowManager.iniciar(chat, "agendar_cita", parametros), prefijo)

    @staticmethod
    def _con_prefijo(resultado, prefijo):
        """Confirma brevemente la selección antes de la siguiente pregunta o resultado."""
        if isinstance(resultado, str):
            return f"{prefijo} {resultado}"
        resultado.prefijo = prefijo
        return resultado

    @staticmethod
    def abandonar(chat):
        """Descarta el borrador: datos, confirmación y transitorios. No toca citas registradas."""
        base = chat.estado_conversacion.split(":")[-1]
        datos = ConversationFlow.obtener(chat)
        memoria = dict(chat.contexto_temporal or {})
        if base in ("agendar_cita", "reprogramar_cita") and datos:
            borrador = {k: datos[k] for k in ("id_medico", "especialidad", "ciudad", "ciudad_omitida", "fecha",
                                              "motivo_consulta", "codigo_cita") if datos.get(k)}
            if borrador:
                memoria["_borrador"] = {"flujo": base, "datos": borrador, "creado": timezone.now().isoformat()}
        for clave in ("_alternativas", "_hora_ambigua", "_fecha_previa"):
            memoria.pop(clave, None)
        chat.contexto_temporal = memoria
        ConversationFlow.finalizar(chat)

    @staticmethod
    def retomar(chat):
        """Retoma el último borrador solo si el usuario lo pide: revalida y vuelve a confirmar."""
        memoria = dict(getattr(chat, "contexto_temporal", None) or {})
        borrador = memoria.pop("_borrador", None)
        if not borrador or not FlowManager._vigente(borrador):
            return "No tengo una solicitud pendiente para retomar. Cuéntame qué necesitas."
        chat.contexto_temporal = memoria
        chat.save(update_fields=["contexto_temporal"])
        return FlowManager.iniciar(chat, borrador["flujo"], borrador["datos"])

    @staticmethod
    def resolver_referencia(chat, mensaje):
        """«Agenda con el segundo», «con ese médico»: usa los resultados guardados.

        Solo actúa ante una petición explícita del usuario y con resultados
        vigentes. Si la referencia es ambigua, pregunta.
        """
        elegida = FlowManager._elegir_alternativa(chat, mensaje)
        if isinstance(elegida, str):
            return elegida
        if elegida:
            return FlowManager.iniciar(chat, "agendar_cita", {
                "id_medico": elegida["id_medico"], "fecha": elegida["fecha"]})
        referencia = referencia_resultado(mensaje)
        resultados = (getattr(chat, "contexto_temporal", None) or {}).get("_resultados")
        if referencia is None:
            return FlowManager.resolver_nombre(chat, mensaje)
        if not solicita_agendar_referencia(mensaje) and not (resultados or {}).get("aclarando"):
            return None
        if not resultados or not FlowManager._vigente(resultados):
            return None
        medicos = resultados.get("medicos") or []
        if referencia == "unico":
            if len(medicos) != 1:
                FlowManager._marcar_aclarando(chat)
                return FlowManager._pedir_aclaracion(medicos)
            elegido = medicos[0]
        elif -len(medicos) <= referencia < len(medicos):
            elegido = medicos[referencia]
        else:
            FlowManager._marcar_aclarando(chat)
            return FlowManager._pedir_aclaracion(medicos)

        from chatbot.services.cita_service import CitaService
        fecha = CitaService.extraer_fecha_relativa(mensaje)
        parametros = {"id_medico": elegido["id_medico"]}
        if fecha is not None:
            parametros["fecha"] = timezone.localtime(fecha).strftime("%Y-%m-%d %H:%M")
        elif CitaService.extraer_dia(mensaje) is not None:
            parametros["fecha_dia"] = CitaService.extraer_dia(mensaje).isoformat()
        elif resultados.get("fecha"):
            parametros["fecha"] = resultados["fecha"]
        detalle = ", ".join(p for p in (elegido.get("especialidad"), elegido.get("ciudad")) if p)
        prefijo = f"Seleccioné al Dr(a). {elegido.get('nombre')}" + (f" ({detalle})." if detalle else ".")
        return FlowManager._con_prefijo(FlowManager.iniciar(chat, "agendar_cita", parametros), prefijo)

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
            return FlowManager._pregunta(paso, contexto, chat)
        return RouterDecision(tool=True, tool_name=flujo["tool"], parametros=contexto)

    @staticmethod
    def _pregunta(paso, contexto, chat=None):
        """Pregunta pendiente. Con médico ya elegido, la de fecha propone sus próximos
        horarios libres (al menos 3, con fecha) y los deja elegibles por número."""
        if paso["campo"] != "fecha":
            return paso["pregunta"]
        from chatbot.politicas import DIAS_BUSQUEDA_HORARIOS, PROXIMOS_HORARIOS
        from chatbot.services.cita_service import CitaService
        from chatbot.services.medico_service import MedicoService
        if chat is not None and chat.estado_conversacion.split(':')[-1] == 'reprogramar_cita':
            cita = (CitaService.obtener_cita_usuario_codigo(contexto['codigo_cita'], chat.id_usuario)
                    if contexto.get('codigo_cita') else
                    CitaService.obtener_cita_usuario(contexto.get('id_cita'), chat.id_usuario))
            if cita is None:
                return 'No encontré esa cita entre tus citas. Indícame el código de la cita que quieres reprogramar.'
            medico = cita.id_medico
        else:
            medico = MedicoService.obtener_por_id(contexto["id_medico"]) if contexto.get('id_medico') else None
        if medico is None:
            return paso["pregunta"]
        dia = CitaService.extraer_dia(contexto["fecha_dia"]) if contexto.get("fecha_dia") else None
        if dia:
            desde = timezone.make_aware(
                timezone.datetime.combine(dia, timezone.datetime.min.time()), timezone.get_current_timezone())
            horarios = [h for h in CitaService.proximos_horarios(medico, desde, 40, 0)]
            horarios = [h for h in horarios if h.date() == dia][:max(PROXIMOS_HORARIOS, 3)]
        else:
            horarios = CitaService.proximos_horarios(medico, timezone.now(), max(PROXIMOS_HORARIOS, 3), DIAS_BUSQUEDA_HORARIOS)
        quien = f"Dr(a). {medico.nombre} {medico.apellido}"
        if not horarios:
            if chat is not None:
                FlowManager.guardar_alternativas(chat, [])
            return (f"{quien} no tiene horarios libres {'ese día' if dia else f'en los próximos {DIAS_BUSQUEDA_HORARIOS} días'}. "
                    "¿Quieres probar otra fecha u otro médico?")
        if chat is not None:
            FlowManager.guardar_alternativas(chat, [
                {"id_medico": medico.pk, "nombre": f"{medico.nombre} {medico.apellido}".strip(), "fecha": h.isoformat()}
                for h in horarios])
        nombres = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
        lineas = [f"{i}. {nombres[h.weekday()].capitalize()} {h.strftime('%d/%m/%Y')} a las {h.strftime('%H:%M')}"
                  for i, h in enumerate(horarios, start=1)]
        return (f"Horarios más cercanos disponibles de {quien}:\n" + "\n".join(lineas)
                + "\nElige uno (número u hora) o dime otra fecha.")

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

    QUITAR_FILTRO = re.compile(
        r"\b(sin|quita\w*|elimina\w*|borra\w*|olvida\w*)\b.{0,25}\b(ciudad|especialidad|fecha|dia|hora)\b|"
        r"\b(cualquier|todas las) (ciudad|ciudades|especialidad|especialidades)\b")

    @staticmethod
    def resolver_busqueda(chat, mensaje):
        """Búsqueda o disponibilidad de médicos registrados, sin crear citas.

        Combina los filtros activos con lo que aporta el mensaje: se pueden
        cambiar o quitar sin reiniciar. Solo aplica sin operación pendiente.
        Devuelve una RouterDecision que ejecuta ``buscar_medico``, o None.
        """
        from chatbot.ai.intencion import tema_ajeno, solicita_ciudades
        from chatbot.ai.router import PATRON_SOLICITUD_CITA

        if PATRON_SOLICITUD_CITA.search(mensaje):
            return None

        memoria = getattr(chat, "contexto_temporal", None) or {}
        ultima = memoria.get("_ultima_cita") or {}
        activos = {
            clave: ultima[clave] for clave in ("especialidad", "ciudad", "ciudad_omitida", "fecha") if ultima.get(clave)
        }
        texto = normalizar_intencion(mensaje)
        ciudades = solicita_ciudades(mensaje)
        busca = solicita_buscar_profesional(mensaje) or bool(re.search(
            r"\b(?:otro|otra) (?:medico|medica|doctor|doctora)\b", texto))
        quita = FlowManager.QUITAR_FILTRO.search(texto)
        datos = FlowManager._extraer_datos_busqueda(mensaje, activos, "buscar_medico")
        estado = es_consulta_estado(mensaje) and ultima.get("especialidad")

        # Un refinamiento corto («ahora en Bogotá», «mañana a las 10») sobre una búsqueda activa.
        refinamiento = bool(activos) and not busca and bool(datos or quita) \
            and len(texto.split()) <= 9 and not tema_ajeno(mensaje)
        disponibilidad = bool(activos) and pregunta_disponibilidad(mensaje) and bool(datos)

        if not (busca or refinamiento or disponibilidad or estado or ciudades):
            return None

        parametros = dict(activos)
        # Una búsqueda nueva de profesionales no hereda el horario de una cita anterior.
        if busca:
            parametros.pop("fecha", None)
        for clave, valor in datos.items():
            if valor is None:
                parametros.pop(clave, None)
            else:
                parametros[clave] = valor
        if quita:
            for clave, palabras in (("ciudad", ("ciudad",)), ("especialidad", ("especialidad",)),
                                    ("fecha", ("fecha", "dia", "hora"))):
                if any(palabra in texto for palabra in palabras):
                    parametros.pop(clave, None)
                    if clave == "ciudad":
                        parametros["ciudad_omitida"] = True
        if parametros.get("ciudad"):
            parametros.pop("ciudad_omitida", None)
        if ciudades:
            parametros.pop("ciudad", None)
            parametros.pop("fecha", None)
            parametros.update(ciudad_omitida=True, listar_ciudades=True)
        if not any(parametros.get(k) for k in ("especialidad", "ciudad", "ciudad_omitida")):
            return None
        decision = RouterDecision(tool=True, tool_name="buscar_medico", parametros=parametros)
        descartados = []
        if activos.get("ciudad") and not parametros.get("ciudad"):
            descartados.append("ciudad")
        if activos.get("fecha") and not parametros.get("fecha"):
            descartados.append("fecha y hora")
        if descartados:
            decision.prefijo = "Quité el filtro de " + " y ".join(descartados) + " para esta búsqueda."
        return decision

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
            return FlowManager._pregunta(paso, contexto, chat)

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
        if chat.estado_conversacion in ("agendar_cita", "reprogramar_cita"):
            elegida = FlowManager._elegir_alternativa(chat, mensaje)
            if isinstance(elegida, str):
                return elegida
            if elegida:
                contexto = ConversationFlow.obtener(chat)
                return FlowManager.iniciar(chat, chat.estado_conversacion, {
                    **contexto, "id_medico": elegida["id_medico"], "fecha": elegida["fecha"]})
            if chat.estado_conversacion == 'agendar_cita' and not ConversationFlow.obtener(chat).get("id_medico"):
                por_nombre = FlowManager.resolver_nombre(chat, mensaje, forzar=True)
                if por_nombre:
                    return por_nombre

        if chat.estado_conversacion in ('agendar_cita', 'reprogramar_cita') and pregunta_disponibilidad(mensaje):
            from chatbot.services.cita_service import CitaService
            contexto = ConversationFlow.obtener(chat)
            dia = CitaService.extraer_dia(mensaje)
            if dia is None:
                dia = CitaService.extraer_dia(contexto.get('fecha_dia') or contexto.get('fecha') or '')
            if dia is None:
                return '¿Para qué día quieres consultar los horarios disponibles?'
            ConversationFlow.guardar(chat, {'fecha_dia': dia.isoformat()})
            return FlowManager._pregunta({'campo': 'fecha', 'pregunta': '¿Qué horario prefieres?'},
                                         ConversationFlow.obtener(chat), chat)

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
                return FlowManager._pregunta(paso, contexto, chat)
            if parametros:
                ConversationFlow.guardar(chat, parametros)
                contexto = ConversationFlow.obtener(chat)

        paso = FlowManager._primer_paso_faltante(flujo, contexto)

        if paso is not None:
            return FlowManager._pregunta(paso, contexto, chat)

        return RouterDecision(
            tool=True,
            tool_name=flujo["tool"],
            parametros=contexto,
        )

    @staticmethod
    def _horario_verificado(contexto):
        """El horario de este médico y esta fecha ya fue validado por la herramienta."""
        from chatbot.services.cita_service import CitaService
        fecha = CitaService.normalizar_fecha(contexto.get("fecha"))
        firma = contexto.get("horario_verificado")
        return bool(firma and contexto.get("id_medico") and fecha is not None
                    and firma == f"{contexto['id_medico']}|{fecha.isoformat()}")

    @staticmethod
    def _primer_paso_faltante(flujo, contexto):
        for paso in flujo["pasos"]:

            # El motivo se pide solo después de comprobar que el horario existe.
            if paso.get("tras") == "horario_verificado" and not FlowManager._horario_verificado(contexto):
                continue

            if paso["campo"] == "fecha" and contexto.get("fecha_dia") and not (
                    contexto.get("fecha") or contexto.get("fecha_programada")):
                dia = str(contexto["fecha_dia"])
                return {**paso, "pregunta": f"¿A qué hora prefieres el {dia[8:10]}/{dia[5:7]}?"}

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
    def _extraer_datos_busqueda(mensaje, contexto, accion):
        """Filtros que aporta el mensaje: ciudad, especialidad, día y hora. Sin modelo."""
        from chatbot.ai.intencion import OMITIR_FILTRO
        from chatbot.services.cita_service import CitaService
        from chatbot.services.medico_service import MedicoService
        datos = {}
        texto = normalizar_intencion(mensaje)
        criterios = MedicoService.extraer_criterios(mensaje)
        datos.update(criterios)
        if "ciudad" not in datos:
            if OMITIR_FILTRO.search(texto):
                datos["ciudad_omitida"] = True
            else:
                ciudad = MedicoService.resolver_ciudad_suelta(mensaje)
                if ciudad:
                    datos["ciudad"] = ciudad
        elif contexto.get("ciudad_omitida"):
            datos["ciudad_omitida"] = None
        if datos.get("ciudad"):
            datos["ciudad_omitida"] = None
        dia = CitaService.extraer_dia(mensaje)
        hora = extraer_hora(mensaje)
        base = dia or (CitaService.extraer_dia(contexto["fecha_dia"]) if contexto.get("fecha_dia") else None)
        if hora is not None and hora[0] != "ambigua" and base is not None:
            datos["fecha"] = f"{base.isoformat()} {hora[0]:02d}:{hora[1]:02d}"
            datos["fecha_dia"] = None
        elif dia is not None:
            # Con solo el día: la búsqueda muestra sus horarios; agendar pregunta la hora.
            datos["fecha" if accion == "buscar_medico" else "fecha_dia"] = dia.isoformat()
        return {k: v for k, v in datos.items() if v is not None or k in ("ciudad_omitida", "fecha_dia")}

    @staticmethod
    def _extraer_seguimiento(chat, mensaje, accion, contexto):
        if accion == 'reprogramar_cita':
            from chatbot.services.cita_service import CitaService
            fecha = CitaService.extraer_fecha_relativa(mensaje)
            if fecha is not None:
                return {'fecha': fecha.isoformat()}
            dia = CitaService.extraer_dia(mensaje)
            hora = extraer_hora(mensaje)
            base = dia or CitaService.extraer_dia(contexto.get('fecha_dia') or '')
            if base is not None and hora is not None and hora[0] != 'ambigua':
                return {'fecha': f'{base.isoformat()} {hora[0]:02d}:{hora[1]:02d}'}
            if dia is not None:
                return {'fecha_dia': dia.isoformat(), 'fecha': None, 'fecha_programada': None}
        if accion in ("buscar_medico", "agendar_cita") and not chat.estado_conversacion.startswith("confirmar:") \
                and FlowManager.campo_libre_pendiente(chat) != "motivo_consulta":
            datos = FlowManager._extraer_datos_busqueda(mensaje, contexto, accion)
            if datos:
                return datos


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
                if re.fullmatch(
                    r"(?:por favor )?(?:agenda\s*me|agenda|agendala|agendamela|reserva\s*me|reservala|confirma\s*me|confirmala)"
                    r"(?: (?:la|una|esa|mi) cita)?(?: por favor)?", respuesta
                ):
                    return {}
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
    def _motivo_nuevo(mensaje):
        """«El motivo es …», «cambia el motivo a …»: motivo corregido, validado por longitud."""
        texto = str(mensaje or "").strip()
        coincidencia = re.match(r"^(?:el\s+)?motivo\s+(?:es|ser[ií]a|ser[aá])\s*:?\s*(.+)$", texto, re.I | re.S) or \
            re.match(r"^(?:cambia(?:r)?|corrige|corregir|actualiza(?:r)?)\s+(?:el\s+)?motivo\s*(?:a|por|:)\s*(.+)$", texto, re.I | re.S)
        motivo = coincidencia.group(1).strip() if coincidencia else ""
        return motivo if 1 <= len(motivo) <= FlowManager.MAX_MOTIVO else None

    @staticmethod
    def cambia_datos(chat, mensaje):
        """¿El mensaje corrige hora, fecha, motivo o médico de la operación pendiente?"""
        memoria = getattr(chat, "contexto_temporal", None) or {}
        return bool(
            parece_cambio_fecha(mensaje) or referencia_horario_anterior(mensaje)
            or FlowManager._motivo_nuevo(mensaje) or parece_cambio_busqueda(mensaje)
            or memoria.get("_hora_ambigua")
        )

    @staticmethod
    def _continuar_confirmacion(chat, mensaje):

        from chatbot.ai.intencion import clasificar_confirmacion
        clase = clasificar_confirmacion(mensaje)

        if clase == "cancela":
            ConversationFlow.finalizar(chat)
            return "Entendido. La operación fue cancelada y no hice cambios."

        if clase != "confirma":
            contexto = ConversationFlow.obtener(chat)
            accion = chat.estado_conversacion.split(':', 1)[1]
            nuevo_motivo = FlowManager._motivo_nuevo(mensaje)
            if nuevo_motivo:
                return FlowManager.iniciar(chat, accion, {**contexto, "motivo_consulta": nuevo_motivo})
            if parece_cambio_busqueda(mensaje):
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
            from chatbot.services.medico_service import MedicoService
            pool = [SimpleNamespace(pk=o["id_medico"], nombre=o.get("nombre", ""), apellido="") for o in opciones]
            candidatos = MedicoService.candidatos_por_nombre(mensaje, pool)
            if len(candidatos) == 1:
                seleccion = next(o for o in opciones if o["id_medico"] == candidatos[0].pk)
            elif len(candidatos) > 1:
                return FlowManager._pedir_aclaracion([o for o in opciones if o["id_medico"] in {c.pk for c in candidatos}])

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
        for clave in ("especialidad", "ciudad", "ciudad_omitida"):
            if contexto.get(clave):
                parametros[clave] = contexto[clave]

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
