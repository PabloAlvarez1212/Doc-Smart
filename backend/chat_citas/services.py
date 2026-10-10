from django.db import transaction
from django.utils import timezone
from datetime import timedelta, timezone as dt_timezone

from citas.models import Cita
from medicos.models import Medico
from users.models import Usuario
from .models import Conversacion


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
    conversacion, creada = Conversacion.objects.get_or_create(cita=cita)
    return conversacion, 201 if creada else 200


def cerrarConversacionPorCancelacionService(cita):
    """Interno: recibe la cita cancelada y bloqueada en la transacción de citas."""
    if cita.id_estado.nombre.lower() != 'cancelada' or cita.fecha_cancelacion is None:
        raise ValueError('Se requiere una cancelación válida con su instante real')
    _utc(cita.fecha_cancelacion)
    conversacion = Conversacion.objects.select_for_update().filter(cita_id=cita.pk).first()
    if conversacion is not None and conversacion.fecha_cierre is None:
        conversacion.fecha_cierre = cita.fecha_cancelacion
        conversacion.save(update_fields=['fecha_cierre'])


def reiniciarConversacionPorReprogramacionService(cita):
    """Interno: nueva fecha ya guardada y cita bloqueada; nunca crea ni reabre."""
    if cita.id_estado.nombre.lower() != 'reprogramada':
        raise ValueError('Se requiere una reprogramación válida')
    conversacion = Conversacion.objects.select_for_update().filter(cita_id=cita.pk).first()
    if conversacion is not None and conversacion.fecha_habilitacion_anticipada is not None:
        conversacion.fecha_habilitacion_anticipada = None
        conversacion.save(update_fields=['fecha_habilitacion_anticipada'])


def cerrarConversacionPorInasistenciaPacienteService(cita):
    """Interno: cita ya validada/bloqueada; cierre con el mismo instante del evento."""
    if cita.id_estado.nombre.lower() != 'inasistencia_paciente' or cita.fecha_inasistencia is None:
        raise ValueError('Se requiere inasistencia del paciente con su instante real')
    _utc(cita.fecha_inasistencia)
    conversacion = Conversacion.objects.select_for_update().filter(cita_id=cita.pk).first()
    if conversacion is not None:
        conversacion.fecha_cierre = cita.fecha_inasistencia
        conversacion.save(update_fields=['fecha_cierre'])


def _utc(fecha):
    if timezone.is_naive(fecha):
        raise ValueError('Las fechas de conversación deben incluir zona horaria')
    return fecha.astimezone(dt_timezone.utc)


def obtenerEstadoConversacionService(conversacion):
    """Consulta sin escrituras; usar una relación cita vigente por solicitud."""
    return _obtener_estado(conversacion, timezone.now())


def _obtener_estado(conversacion, ahora):
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
            and solicitante.pk == cita.id_medico_id
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
    """Política de dominio para futuras interacciones; aún no hay mensajes."""
    return (_es_participante_autorizado(conversacion, solicitante)
            and obtenerEstadoConversacionService(conversacion)['estado'] == 'activo')


def puedeAccederConversacionService(conversacion, solicitante):
    """Compatibilidad: el acceso de Fase 1 siempre significó poder interactuar."""
    return puedeEscribirConversacionService(conversacion, solicitante)


@transaction.atomic
def habilitarConversacionAnticipadamenteService(conversacion_id, solicitante, *, estricto=False):
    cita_id = Conversacion.objects.filter(pk=conversacion_id).values_list('cita_id', flat=True).first()
    if cita_id is None:
        return 'Conversación no encontrada', 404
    cita = _bloquear_cita(cita_id)
    conversacion = Conversacion.objects.select_for_update().filter(pk=conversacion_id).first()
    if cita is None or conversacion is None:
        return 'Conversación no encontrada', 404
    if conversacion.cita_id != cita.pk:
        raise RuntimeError('La cita de la conversación cambió; reintenta la operación')
    conversacion.cita = cita
    if not isinstance(solicitante, Medico) or not _es_medico_propietario(cita, Medico.objects.get(pk=solicitante.pk)):
        return 'Solo el médico propietario aprobado puede habilitar la conversación', 403
    if cita.id_estado.nombre.lower() not in ('confirmada', 'reprogramada'):
        return 'La cita no admite habilitación anticipada', 400
    ahora = timezone.now()
    estado = _obtener_estado(conversacion, ahora)['estado']
    if estado in (None, 'cerrado'):
        return 'La conversación no está disponible', 400
    if conversacion.fecha_habilitacion_anticipada is not None:
        if estricto:
            return 'La conversación ya fue habilitada', 409
        return conversacion, 200
    if estado == 'activo':
        return 'La conversación ya está habilitada automáticamente', 400
    conversacion.fecha_habilitacion_anticipada = ahora
    conversacion.save(update_fields=['fecha_habilitacion_anticipada'])
    from .event_services import registrarEventoConversacionService
    from uuid import uuid4
    registrarEventoConversacionService(cita, clave=f'habilitada:{uuid4()}',
        evento='chat_habilitado', metadata={'actor': {'tipo': 'medico', 'id': solicitante.pk}}, instante=ahora)
    return conversacion, 200
