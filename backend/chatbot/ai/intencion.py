"""¿El mensaje continúa la operación pendiente, la abandona o cambia de tema?

Se decide ANTES de interpretar el mensaje como respuesta al dato pendiente.
Cambiar de tema abandona el borrador sin cancelar jamás una cita registrada.
"""
import re

from chatbot.ai.conversation_flow import ConversationFlow
from chatbot.ai.filters import (
    extraer_hora,
    normalizar_intencion,
    parece_cambio_fecha,
    referencia_resultado,
    solicita_buscar_profesional,
    solicita_cancelar_flujo,
)

AFIRMATIVAS = {"si", "confirmo", "confirmar", "acepto", "de acuerdo", "claro", "dale", "yes", "ok", "listo"}
NEGATIVAS = {"no", "no confirmo", "cancelar", "cancela"}

def solicita_ciudades(mensaje):
    return bool(re.search(r"\b(?:en que|cuales|que|otras|todas las) ciudades\b", normalizar_intencion(mensaje)))

OMITIR_FILTRO = re.compile(
    r"\b(cualquiera|cualquier ciudad|todas( las ciudades)?|no importa|me da igual|sin (filtro|ciudad)|donde sea)\b"
)

# Otras funciones de DocSmart o de Bymax: no son respuesta a ningún dato pendiente.
_TEMAS_AJENOS = [
    r"\bhistori(al|a) (clinic[ao]|medic[ao])\b|\bmi historial\b",
    r"\b(mi perfil|mis datos|mi contrasena|mi correo|mi foto)\b",
    r"\b(notificaciones|favoritos|mis chats)\b",
    r"\b(mis citas|proximas citas|citas programadas|mi proxima cita|ver mis citas)\b",
    r"\b(como funciona|que es docsmart|que puedes hacer|para que sirve|quien eres|como te llamas)\b",
    r"\b(como (veo|encuentro|accedo|uso|consulto)|donde (encuentro|veo|puedo ver|puedo encontrar|esta|queda))\b",
    r"\b(me siento (muy )?(triste|ansios[oa]|estresad[oa]|sol[oa]|agotad[oa]|deprimid[oa])|"
    r"necesito despejar|estoy estresad[oa]|tengo ansiedad)\b",
    r"^(gracias|muchas gracias|eso es todo|nada mas)\b",
    r"^(que|como|cual|cuando|por que|es normal|puedo|debo)\b.*\b(tomar|medicamento|dosis|significa|grave|dieta|ejercicio)\b",
]
_CAMBIA_OTRA_CITA = re.compile(r"\b(cancel\w*|reprogram\w*)\b.{0,30}\bcita\b")
_RELACIONADO = re.compile(r"\b(medico|medica|doctor|doctora|cita|horario|disponib\w*|agenda|especialidad|ciudad|consultorio|precio|costo)\b")
_RETOMAR = re.compile(
    r"\b(retoma\w*|reanuda\w*|sigamos con|seguir con|continuemos con|continua con|volvamos a)\b"
    r".{0,40}\b(cita|agendamiento|solicitud|lo de antes|lo anterior|lo que estabamos)\b")


_NEGA_CONFIRMAR = re.compile(r"\bno\b (?:la |lo |me )?(?:confirm\w*|agend\w*|reserv\w*)")
_FUERTE = re.compile(r"\b(confirma|confirmala|confirmalo|confirmame|confirmo|agendala|agendamela|reservala|procede|hazlo|adelante)\b")
_DEBIL = re.compile(r"^(si|claro|dale|listo|vale|perfecto|ok|okay|yes|confirm|de acuerdo|acepto|por supuesto|exacto)\b")
_DUDA = re.compile(r"\b(pero|aunque|antes|primero|espera\w*|duda|pregunta|necesario|crees|piensas|deberia|conviene|podria|puedo|como|cuanto|cuando|donde|por que|que)\b")
_CANCELA = re.compile(
    r"^(no|nop|nel)( gracias| quiero| la| lo| confirmo)?$|^cancelar( la cita| esto)?$|"
    r"\b(cancela|cancelala|cancelalo|cancelamela|cancelemos|descarta|descartala|olvidalo|olvidala|mejor no|"
    r"ya no quiero|no quiero (?:la cita|agendar|continuar|seguir)|no la agendes|no la confirmes|no confirmo)\b")


def clasificar_confirmacion(mensaje):
    """'confirma', 'cancela' o 'consulta' (pregunta o comentario que no decide).

    Acepta «sí», «confírmala», «agéndala», «cancela», «mejor no»…; una duda
    («¿crees que es necesario?») o una contradicción no ejecuta nada.
    """
    t = normalizar_intencion(mensaje)
    if not t:
        return "consulta"
    pregunta = "?" in str(mensaje)
    nega = bool(_NEGA_CONFIRMAR.search(t))
    cancela = bool(_CANCELA.search(t)) or nega
    fuerte = bool(_FUERTE.search(t)) and not nega
    debil = bool(_DEBIL.match(t)) and len(t.split()) <= 6 and not _DUDA.search(t) and not pregunta
    if cancela and (fuerte or debil):
        return "consulta"
    if fuerte or debil:
        return "confirma"
    if cancela and not (pregunta and not re.search(r"\b(cancela|cancelala|cancelalo|descarta|olvidalo)\b", t)):
        return "cancela"
    return "consulta"


def solicita_retomar(mensaje):
    return bool(_RETOMAR.search(normalizar_intencion(mensaje)))


def tema_ajeno(mensaje, estado=""):
    """Otra función, otra consulta o una nueva búsqueda: nunca respuesta a un dato pendiente."""
    t = normalizar_intencion(mensaje)
    if solicita_ciudades(mensaje) or re.search(r"\b(?:otro|otra) (?:medico|medica|doctor|doctora)\b", t):
        return True
    if any(re.search(patron, t) for patron in _TEMAS_AJENOS):
        return True
    if _CAMBIA_OTRA_CITA.search(t) and estado not in ("cancelar_cita", "reprogramar_cita"):
        return True
    if solicita_buscar_profesional(mensaje):
        from chatbot.services.medico_service import MedicoService
        return bool(MedicoService.extraer_criterios(mensaje))
    return False


def pendiente_del_flujo(chat):
    """Qué espera la operación activa: fecha, ciudad, motivo, selección, confirmación…"""
    from chatbot.ai.flow_definition import FLOWS
    from chatbot.ai.flow_manager import FlowManager
    estado = chat.estado_conversacion
    if estado.startswith("seleccionar_medico:"):
        return "seleccion"
    if estado.startswith("confirmar:"):
        return "confirmacion"
    flujo = FLOWS.get(estado)
    if flujo is None:
        return "otro"
    contexto = ConversationFlow.obtener(chat)
    paso = FlowManager._primer_paso_faltante(flujo, contexto)
    if paso is None:
        return "alternativa" if (getattr(chat, "contexto_temporal", None) or {}).get("_alternativas") else "otro"
    return {"especialidad": "especialidad", "ciudad": "ciudad", "fecha": "fecha",
            "motivo_consulta": "motivo", "motivo_cancelacion": "motivo",
            "codigo_cita": "codigo"}.get(paso["campo"], "otro")


def _habla_de_fecha(mensaje):
    from chatbot.services.cita_service import CitaService
    t = normalizar_intencion(mensaje)
    return bool(
        CitaService.extraer_dia(mensaje) or extraer_hora(mensaje) or parece_cambio_fecha(mensaje)
        or re.search(r"\b(a las|hora|fecha|dia|temprano|tarde|noche|manana)\b", t)
    )


def _nombre_de_resultados(chat, mensaje):
    from types import SimpleNamespace
    from chatbot.services.medico_service import MedicoService
    memoria = getattr(chat, "contexto_temporal", None) or {}
    contexto = ConversationFlow.obtener(chat)
    medicos = (contexto.get("medicos") or (memoria.get("_resultados") or {}).get("medicos") or [])
    pool = [SimpleNamespace(pk=m.get("id_medico"), nombre=m.get("nombre", ""), apellido="") for m in medicos]
    return bool(pool and MedicoService.candidatos_por_nombre(mensaje, pool))


def responde_pendiente(chat, mensaje, pendiente):
    """¿Aporta el dato que la operación está esperando (o la modifica de forma válida)?"""
    from chatbot.services.medico_service import MedicoService
    t = normalizar_intencion(mensaje)
    ordinal = t.isdigit() or referencia_resultado(mensaje) is not None
    if pendiente == "fecha":
        return _habla_de_fecha(mensaje) or ordinal
    if pendiente == "alternativa":
        return _habla_de_fecha(mensaje) or ordinal
    if pendiente == "ciudad":
        return bool(OMITIR_FILTRO.search(t) or MedicoService.resolver_ciudad(mensaje)
                    or MedicoService.resolver_ciudad_suelta(mensaje))
    if pendiente == "especialidad":
        return bool(MedicoService.resolver_especialidad(mensaje)) or (len(t.split()) <= 4 and "?" not in mensaje)
    if pendiente == "codigo":
        return bool(re.search(r"\bdoc-[a-z0-9]{8}\b", mensaje, re.I)) or t.isdigit() or "cita" in t
    if pendiente == "seleccion":
        return ordinal or _nombre_de_resultados(chat, mensaje) or _habla_de_fecha(mensaje) \
            or bool(re.search(r"\b(otro|otra|ninguno|ninguna)\b", t))
    if pendiente == "confirmacion":
        return (t in AFIRMATIVAS or t in NEGATIVAS or _habla_de_fecha(mensaje)
                or "motivo" in t or _nombre_de_resultados(chat, mensaje)
                or bool(_RELACIONADO.search(t)))
    return False


def decidir(chat, mensaje):
    """'continua', 'abandona' o 'ambiguo' (la operación decide qué repreguntar)."""
    if solicita_cancelar_flujo(mensaje):
        return "abandona"
    pendiente = pendiente_del_flujo(chat)
    estado = chat.estado_conversacion
    if pendiente == "confirmacion":
        t = normalizar_intencion(mensaje)
        if any(re.search(patron, t) for patron in _TEMAS_AJENOS[:6]):
            return "abandona"
        return "abandona" if (solicita_buscar_profesional(mensaje) and tema_ajeno(mensaje, estado)) else "continua"
    if pendiente == "motivo":  # texto libre: solo otra función lo desvía
        return "abandona" if tema_ajeno(mensaje, estado) else "continua"
    if responde_pendiente(chat, mensaje, pendiente):
        return "continua"
    if tema_ajeno(mensaje, estado):
        return "abandona"
    from chatbot.ai.router import PATRON_CONSULTA_MEDICA
    if PATRON_CONSULTA_MEDICA.search(mensaje):
        return "abandona"
    return "continua" if _RELACIONADO.search(normalizar_intencion(mensaje)) else "ambiguo"


_AYUDA = [
    (r"\bhistori(al|a) (clinic[ao]|medic[ao])\b|\bmi historial\b",
     "Puedes ver tu historial clínico en «Historial clínico», en el menú del paciente "
     "(/patient/my-medical-history). Ahí aparecen los registros que tus médicos cierran tras cada consulta. "
     "Si prefieres, pídeme «muéstrame mi historial clínico» y te lo resumo aquí."),
    (r"\b(mis citas|proximas citas|citas programadas|mi proxima cita)\b",
     "Tus citas están en «Mis citas» (/patient/my-appointments), con su estado y su código. "
     "También puedo listarlas aquí si me lo pides."),
    (r"\b(mi perfil|mis datos|mi contrasena|mi correo|mi foto)\b",
     "Tus datos personales están en «Perfil» (/patient/my-profile)."),
    (r"\bnotificaciones\b", "Las notificaciones están en el icono de campana o en /patient/notifications."),
    (r"\bfavoritos\b", "Tus médicos favoritos están en /patient/favorites."),
    (r"\bmis chats\b", "Tus conversaciones con médicos están en «Mis chats» (/patient/my-chats)."),
    (r"\b(encontrar|buscar) (un )?(doctor|doctores|medico|medicos)\b",
     "Puedes explorar médicos en «Encontrar doctores» (/patient/find-doctors), o pedirme aquí que los busque."),
]


def ayuda_funciones(mensaje):
    """Respuesta fija a «¿dónde/cómo veo …?» sobre las pantallas de DocSmart."""
    t = normalizar_intencion(mensaje)
    if not re.search(r"\b(donde|como)\b.{0,30}\b(encuentro|veo|accedo|consulto|puedo ver|puedo encontrar|esta|queda|uso)\b", t):
        return None
    for patron, texto in _AYUDA:
        if re.search(patron, t):
            return texto
    return None
