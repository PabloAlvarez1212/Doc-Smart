from django.db import transaction
from django.utils import timezone
from datetime import timedelta, timezone as dt_timezone

from citas.models import Cita
from medicos.models import Medico
from users.models import Usuario
from .models import Conversacion
from django.db.models import Q
from types import SimpleNamespace


def resolverConversacion(conversacion_id):
    conv = Conversacion.objects.select_related('canonica', 'cita__id_estado', 'cita__id_medico', 'cita__id_usuario').filter(pk=conversacion_id).first()
    if conv is not None and conv.canonica_id:
        return Conversacion.objects.select_related('cita__id_estado', 'cita__id_medico', 'cita__id_usuario').get(pk=conv.canonica_id)
    return conv


def conversacionDeCita(cita):
    if cita.conversacion_chat_id:
        return resolverConversacion(cita.conversacion_chat_id)
    legacy = Conversacion.objects.filter(cita_id=cita.pk).first()
    return resolverConversacion(legacy.pk) if legacy else None


def citasConversacion(conv):
    cached = getattr(conv, '_prefetched_objects_cache', {}).get('citas_vinculadas')
    if cached is not None:
        rows = [conv.cita if c.pk == conv.cita_id else c for c in cached]
        if not any(c.pk == conv.cita_id for c in rows):
            rows.append(conv.cita)
        return rows
    return [conv.cita] + list(Cita.objects.filter(conversacion_chat_id=conv.pk).exclude(pk=conv.cita_id).select_related('id_estado').order_by('fecha_programada', 'pk'))


def _estado_individual(conv, cita, ahora):
    return _estado_cita(SimpleNamespace(cita=cita,
        fecha_habilitacion_anticipada=cita.fecha_chat_habilitacion or (conv.fecha_habilitacion_anticipada if cita.pk == conv.cita_id else None),
        fecha_cierre=cita.fecha_chat_cierre or (conv.fecha_cierre if cita.pk == conv.cita_id else None)), ahora)


def citaContextual(conv, ahora=None):
    ahora = ahora or timezone.now()
    citas = citasConversacion(conv)
    activas = [c for c in citas if _estado_individual(conv, c, ahora)['estado'] == 'activo']
    futuras = [c for c in citas if c.id_estado.nombre.lower() in ('confirmada', 'reprogramada')]
    return (activas or futuras or sorted(citas, key=lambda c: c.fecha_programada, reverse=True))[0]


def _bloquear_cita(cita_id):
    """Dentro de atomic: médico → cita; nunca bloquear otro médico después."""
    medico_id = Cita.objects.filter(pk=cita_id).values_list('id_medico_id', flat=True).first()
    if medico_id is None:
        return None
    Medico.objects.select_for_update().get(pk=medico_id)
    cita = Cita.objects.select_for_update().filter(pk=cita_id).first()
    if cita is not None and cita.id_medico_id != medico_id:
        raise RuntimeError('El médico de la cita cambió; reintenta la operación')
    return cita


@transaction.atomic
def prepararConversacionService(cita_id):
    cita = _bloquear_cita(cita_id)
    if cita is None:
        return 'Cita no encontrada', 404
    if cita.id_estado.nombre.lower() != 'confirmada':
        return 'La cita debe estar confirmada', 400
    conversacion, creada = Conversacion.objects.get_or_create(
        medico_id=cita.id_medico_id, paciente_id=cita.id_usuario_id, defaults={'cita': cita})
    vincularConversacionExistenteService(cita, notificar=not creada)
    return conversacion, 201 if creada else 200


@transaction.atomic
def vincularConversacionExistenteService(cita, *, notificar=True):
    """En escritura de citas, nunca desde GET. No crea chats para pendientes."""
    cita = _bloquear_cita(cita.pk)
    conv = Conversacion.objects.select_for_update().filter(
        medico_id=cita.id_medico_id, paciente_id=cita.id_usuario_id).first()
    if conv is not None and cita.conversacion_chat_id != conv.pk:
        cita.conversacion_chat = conv
        cita.save(update_fields=['conversacion_chat'])
        from .models import EstadoParticipante
        EstadoParticipante.objects.filter(conversacion=conv, oculta=True).update(oculta=False)
        from .realtime import programarEventoChat
        if notificar:
            programarEventoChat(conv.pk, 'chat.conversation.updated', {'id': conv.pk})
    return conv


def cerrarConversacionPorCancelacionService(cita):
    """Interno: recibe la cita cancelada y bloqueada en la transacción de citas."""
    if cita.id_estado.nombre.lower() != 'cancelada' or cita.fecha_cancelacion is None:
        raise ValueError('Se requiere una cancelación válida con su instante real')
    _utc(cita.fecha_cancelacion)
    _cerrar_ventana_cita(cita, cita.fecha_cancelacion)


def reiniciarConversacionPorReprogramacionService(cita):
    """Interno: nueva fecha ya guardada y cita bloqueada; nunca crea ni reabre."""
    if cita.id_estado.nombre.lower() != 'reprogramada':
        raise ValueError('Se requiere una reprogramación válida')
    cita.fecha_chat_habilitacion = None
    cita.save(update_fields=['fecha_chat_habilitacion'])
    conversacion = conversacionDeCita(cita)
    if conversacion is not None and conversacion.cita_id == cita.pk and conversacion.fecha_habilitacion_anticipada is not None:
        conversacion.fecha_habilitacion_anticipada = None
        conversacion.save(update_fields=['fecha_habilitacion_anticipada'])


def cerrarConversacionPorInasistenciaPacienteService(cita):
    """Interno: cita ya validada/bloqueada; cierre con el mismo instante del evento."""
    if cita.id_estado.nombre.lower() != 'inasistencia_paciente' or cita.fecha_inasistencia is None:
        raise ValueError('Se requiere inasistencia del paciente con su instante real')
    _utc(cita.fecha_inasistencia)
    _cerrar_ventana_cita(cita, cita.fecha_inasistencia, preservar=False)


def _cerrar_ventana_cita(cita, instante, preservar=True):
    cita.fecha_chat_cierre = instante
    cita.save(update_fields=['fecha_chat_cierre'])
    conv = conversacionDeCita(cita)
    if conv is not None:
        conv = Conversacion.objects.select_for_update().get(pk=conv.pk)
        if conv.cita_id == cita.pk:
            conv.fecha_cierre = (conv.fecha_cierre or instante) if preservar else instante
            conv.save(update_fields=['fecha_cierre'])


def _utc(fecha):
    if timezone.is_naive(fecha):
        raise ValueError('Las fechas de conversación deben incluir zona horaria')
    return fecha.astimezone(dt_timezone.utc)


def obtenerEstadoConversacionService(conversacion):
    """Consulta sin escrituras; usar una relación cita vigente por solicitud."""
    return _obtener_estado(conversacion, timezone.now())


def _obtener_estado(conversacion, ahora):
    estados = [_estado_individual(conversacion, cita, ahora) for cita in citasConversacion(conversacion)]
    activas = [e for e in estados if e['estado'] == 'activo']
    programadas = [e for e in estados if e['estado'] == 'programado']
    elegido = (activas or programadas or estados)[0]
    resultado = dict(elegido)
    resultado['estado'] = 'activo' if activas else 'programado' if programadas else 'cerrado' if any(e['estado'] == 'cerrado' for e in estados) else None
    resultado['habilitacion'] = ('automatica' if any(e['estado'] == 'activo' and (e['fecha_cierre_automatico'] or _utc(ahora) >= e['fecha_habilitacion_automatica']) for e in estados)
                                else 'manual' if activas else None)
    resultado['puede_deshabilitar'] = bool(activas) and resultado['habilitacion'] == 'manual'
    limites = [fecha for e in estados if e['estado'] in ('programado', 'activo')
               for fecha in (e['fecha_habilitacion_automatica'], e['fecha_cierre_automatico'])
               if fecha is not None and fecha > _utc(ahora)]
    resultado['proxima_transicion'] = min(limites, default=None)
    return resultado


def _estado_cita(conversacion, ahora):
    ahora = _utc(ahora)
    automatica = _utc(conversacion.cita.fecha_programada) - timedelta(hours=24)
    anticipada = conversacion.fecha_habilitacion_anticipada
    cierre = conversacion.fecha_cierre
    for fecha in (anticipada, cierre):
        if fecha is not None:
            _utc(fecha)
    estado_cita = conversacion.cita.id_estado.nombre.lower()
    cierre_automatico = None
    if estado_cita == 'completada':
        # Sin backfill: citas históricas usaban fecha_final como instante real.
        completada = conversacion.cita.fecha_completada or conversacion.cita.fecha_final
        if completada is not None:
            cierre_automatico = _utc(completada) + timedelta(hours=24)
    if estado_cita in ('cancelada', 'inasistencia_paciente', 'vencida'):
        estado = 'cerrado'
    elif estado_cita not in ('confirmada', 'reprogramada', 'completada'):
        estado = None
    elif cierre is not None:
        estado = 'cerrado'
    elif estado_cita == 'completada':
        if cierre_automatico is None:
            estado = None
        else:
            estado = 'activo' if ahora < cierre_automatico else 'cerrado'
    elif anticipada is not None or ahora >= automatica:
        estado = 'activo'
    else:
        estado = 'programado'
    return {'estado': estado, 'fecha_habilitacion_automatica': automatica,
            'fecha_habilitacion_anticipada': anticipada, 'fecha_cierre': cierre,
            'fecha_cierre_automatico': cierre_automatico}


def _es_medico_propietario(cita, solicitante):
    return (isinstance(solicitante, Medico)
            and getattr(solicitante, 'is_authenticated', False)
            and solicitante.pk == cita.id_medico_id
            and solicitante.id_rol.nombre.strip().lower() in ('doctor', 'medico')
            and solicitante.esta_aprobado)


def _es_participante_autorizado(conversacion, solicitante):
    cita = conversacion.cita
    if isinstance(solicitante, Usuario):
        return (solicitante.pk == cita.id_usuario_id
                and solicitante.id_rol.nombre == 'paciente')
    return _es_medico_propietario(cita, solicitante)


def puedeVerConversacionService(conversacion, solicitante):
    """Programadas y cerradas son visibles; no disponible no autoriza consulta."""
    return (_es_participante_autorizado(conversacion, solicitante)
            and obtenerEstadoConversacionService(conversacion)['estado']
            in ('programado', 'activo', 'cerrado'))


def puedeEscribirConversacionService(conversacion, solicitante):
    """Permite nuevas escrituras únicamente en la unión de ventanas activas."""
    return (_es_participante_autorizado(conversacion, solicitante)
            and obtenerEstadoConversacionService(conversacion)['estado'] == 'activo')


def puedeAccederConversacionService(conversacion, solicitante):
    """Compatibilidad: el acceso de Fase 1 siempre significó poder interactuar."""
    return puedeEscribirConversacionService(conversacion, solicitante)


@transaction.atomic
def habilitarConversacionAnticipadamenteService(conversacion_id, solicitante, *, estricto=False):
    base = resolverConversacion(conversacion_id)
    cita_id = base.cita_id if base else None
    if cita_id is None:
        return 'Conversación no encontrada', 404
    cita = _bloquear_cita(cita_id)
    conversacion = Conversacion.objects.select_for_update().filter(pk=base.pk).first()
    if cita is None or conversacion is None:
        return 'Conversación no encontrada', 404
    if conversacion.cita_id != cita.pk:
        raise RuntimeError('La cita de la conversación cambió; reintenta la operación')
    conversacion.cita = cita
    if not isinstance(solicitante, Medico) or not _es_medico_propietario(cita, Medico.objects.get(pk=solicitante.pk)):
        return 'Solo el médico propietario aprobado puede habilitar la conversación', 403
    ahora = timezone.now()
    actual = _obtener_estado(conversacion, ahora)
    estado = actual['estado']
    if estado in (None, 'cerrado'):
        return 'La conversación no está disponible', 400
    if estado == 'activo' and any(c.fecha_chat_habilitacion for c in citasConversacion(conversacion)):
        if estricto:
            return 'La conversación ya fue habilitada', 409
        return conversacion, 200
    if estado == 'activo':
        return 'La conversación ya está habilitada automáticamente', 400
    candidatas = [c for c in citasConversacion(conversacion) if _estado_individual(conversacion, c, ahora)['estado'] == 'programado']
    if not candidatas:
        return 'La cita no admite habilitación anticipada', 400
    cita = candidatas[0]
    cita.fecha_chat_habilitacion = ahora
    cita.save(update_fields=['fecha_chat_habilitacion'])
    if cita.pk == conversacion.cita_id:
        conversacion.fecha_habilitacion_anticipada = ahora
        conversacion.save(update_fields=['fecha_habilitacion_anticipada'])
    from .event_services import registrarEventoConversacionService
    from uuid import uuid4
    registrarEventoConversacionService(cita, clave=f'habilitada:{uuid4()}',
        evento='chat_habilitado', metadata={'actor': {'tipo': 'medico', 'id': solicitante.pk}}, instante=ahora)
    return conversacion, 200


@transaction.atomic
def deshabilitarConversacionService(conversacion_id, solicitante):
    base = resolverConversacion(conversacion_id)
    if base is None:
        return 'Conversación no encontrada', 404
    cita = _bloquear_cita(base.cita_id)
    conv = Conversacion.objects.select_for_update().get(pk=base.pk)
    conv.cita = cita
    if not isinstance(solicitante, Medico) or not _es_medico_propietario(cita, Medico.objects.get(pk=solicitante.pk)):
        return 'Solo el médico propietario aprobado puede deshabilitar el chat', 403
    state = _obtener_estado(conv, timezone.now())
    if not state['puede_deshabilitar']:
        return 'No se puede deshabilitar: existe una ventana automática activa o no hay habilitación anticipada', 400
    Cita.objects.filter(Q(conversacion_chat_id=conv.pk) | Q(pk=conv.cita_id)).update(fecha_chat_habilitacion=None)
    conv.fecha_habilitacion_anticipada = None
    conv.save(update_fields=['fecha_habilitacion_anticipada'])
    from .event_services import registrarEventoConversacionService
    from uuid import uuid4
    registrarEventoConversacionService(cita, clave=f'deshabilitada:{uuid4()}', evento='chat_deshabilitado', metadata={}, instante=timezone.now())
    return conv, 200
