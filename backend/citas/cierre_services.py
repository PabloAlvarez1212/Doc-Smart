import logging
from datetime import timedelta
from django.core.exceptions import ValidationError
from django.utils import timezone
from catalogos.models import Estado
from citas.models import Cita, DocumentoSeguimientoCita
from citas.serializers import CitaSerializer
from citas.services import serializar_agenda
from medicos.models import Medico
from notificaciones.services import enviarNotificacion
from storage_app import services as storage
from storage_app.validators import validar_archivo_seguimiento

logger = logging.getLogger(__name__)
ESTADOS_ATENCION = ('pendiente', 'confirmada', 'reprogramada')


def limiteCierre(cita):
    # Compatibilidad sin backfill: sólo derivar cuando hay fin conocido.
    return cita.fecha_limite_cierre or (cita.fecha_final + timedelta(hours=72) if cita.fecha_final else None)


def validarVentanaCierre(cita, ahora):
    if cita.id_estado.nombre.lower() not in (*ESTADOS_ATENCION, 'completada') or cita.fecha_inasistencia:
        return 'La cita cancelada, vencida o con inasistencia no admite seguimiento', 400
    limite = limiteCierre(cita)
    if limite is None:
        return 'La cita no tiene un fin programado válido para establecer el plazo de cierre', 400
    if any(timezone.is_naive(value) for value in (ahora, cita.fecha_programada, limite)):
        return 'Se requieren fechas con zona horaria', 400
    if ahora < cita.fecha_programada:
        return 'La cita todavía no ha iniciado', 400
    if ahora >= limite:
        return 'El plazo de 72 horas para registrar seguimiento y completar la cita ha vencido', 400
    return None


def _notificar(cita, titulo, mensaje, tipo, *, medico=False):
    return enviarNotificacion(titulo=titulo, mensaje=mensaje, tipo=tipo,
        **({'id_medico': cita.id_medico_id} if medico else {'id_usuario': cita.id_usuario_id}),
        extra_data={'tipo_evento': 'ACTUALIZACION_CITA', 'cita': CitaSerializer(cita).data})


def _citaVisible(id, actor):
    from users.models import Usuario
    cita = Cita.objects.select_related('id_medico', 'id_estado').filter(pk=id).first()
    if cita is None:
        return None, ('Cita no encontrada', 404)
    approved = (isinstance(actor, Medico) and actor.pk == cita.id_medico_id and cita.id_medico.esta_aprobado
                and cita.id_medico.id_rol.nombre.lower() != 'admin')
    patient = isinstance(actor, Usuario) and actor.pk == cita.id_usuario_id and actor.id_rol.nombre.lower() == 'paciente'
    return (cita, None) if approved or patient else (None, ('No tienes permiso para consultar los documentos de esta cita', 403))


def listarDocumentosCitaService(id, actor):
    cita, error = _citaVisible(id, actor)
    if error:
        return error
    return [{'id': doc.pk, 'archivo_id': doc.archivo_id, 'nombre': doc.archivo.nombre_original,
             'content_type': doc.archivo.content_type, 'tamano': doc.archivo.tamano, 'fecha_subida': doc.fecha_subida.isoformat()}
            for doc in cita.documentos_seguimiento.filter(archivo__activo=True).select_related('archivo').order_by('pk')], 200


def obtenerUrlDocumentoCitaService(id, documento_id, actor):
    cita, error = _citaVisible(id, actor)
    if error:
        return error
    doc = cita.documentos_seguimiento.select_related('archivo').filter(pk=documento_id, archivo__activo=True).first()
    if doc is None:
        return 'Documento no encontrado', 404
    url = storage.generar_url_firmada(doc.archivo.storage_key, expiracion=600,
        nombre_descarga=doc.archivo.nombre_original)
    return ({'url': url, 'expiracion': 600}, 200) if url else ('Archivo temporalmente no disponible', 503)


@serializar_agenda
def subirDocumentosCitaService(id, actor, archivos):
    cita = Cita.objects.select_for_update().filter(pk=id).first()
    if cita is None:
        return 'Cita no encontrada', 404
    if not isinstance(actor, Medico) or actor.pk != cita.id_medico_id or not cita.id_medico.esta_aprobado or cita.id_medico.id_rol.nombre.lower() == 'admin':
        return 'Solo el médico propietario aprobado puede registrar seguimiento', 403
    error = validarVentanaCierre(cita, timezone.now())
    if error:
        return error
    if not 1 <= len(archivos) <= 5:
        return 'Debes enviar entre uno y cinco archivos en el campo archivos', 400
    try:
        for archivo in archivos:
            validar_archivo_seguimiento(archivo)
    except ValidationError as exc:
        return '; '.join(exc.messages), 400
    registros = []
    try:
        documentos = []
        for archivo in archivos:
            registro = storage.guardar_archivo_medico(archivo, actor.pk, categoria='seguimiento_cita', referencia_id=cita.pk)
            registros.append(registro)
            document = DocumentoSeguimientoCita.objects.create(cita=cita, archivo=registro)
            documentos.append({'id': document.pk, 'archivo_id': registro.pk, 'nombre': registro.nombre_original,
                               'content_type': registro.content_type, 'tamano': registro.tamano, 'fecha_subida': document.fecha_subida.isoformat()})
        # El storage puede consumir parte del plazo: revalidar antes de publicar el lote.
        error = validarVentanaCierre(cita, timezone.now())
        if error:
            raise ValidationError(error[0])
        if cita.id_estado.nombre.lower() == 'completada':
            _notificar(cita, 'Nueva documentación de seguimiento',
                       'Se agregó nueva documentación de seguimiento a tu consulta.', 'documentacion_seguimiento')
        return documentos, 201
    except Exception:
        for registro in registros:
            try:
                if not storage.eliminar_archivo(registro.storage_key):
                    logger.error('Seguimiento pendiente de limpieza: archivo_id=%s key=%s', registro.pk, registro.storage_key)
            except Exception:
                logger.exception('Fallo compensando carga de seguimiento: archivo_id=%s', registro.pk)
        raise


@serializar_agenda
def _procesarCitaCierre(id):
    cita = Cita.objects.select_for_update().filter(pk=id).first()
    if (cita is None or cita.id_estado.nombre.lower() not in ESTADOS_ATENCION
            or cita.fecha_inasistencia or cita.fecha_limite_cierre is None or cita.fecha_final is None):
        return {}
    ahora = timezone.now()
    fecha = timezone.localtime(cita.fecha_programada).strftime('%d/%m/%Y a las %H:%M')
    counts = {}
    # Un cron atrasado vence directamente; no envía recordatorios ya sin utilidad.
    if ahora >= cita.fecha_limite_cierre:
        cita.id_estado = Estado.objects.get(nombre__iexact='vencida')
        cita.fecha_vencimiento = ahora
        cita.save(update_fields=['id_estado', 'fecha_vencimiento'])
        from chat_citas.models import Conversacion
        from chat_citas.event_services import registrarEventoConversacionService
        conv = Conversacion.objects.select_for_update().filter(cita=cita).first()
        if conv is not None:
            conv.fecha_cierre = conv.fecha_cierre or ahora
            conv.save(update_fields=['fecha_cierre'])
        registrarEventoConversacionService(cita, clave=f'vencida:{ahora.isoformat()}', evento='cita_vencida', instante=ahora, metadata={})
        _notificar(cita, 'Plazo de cierre vencido', f'El plazo de cierre de la cita del {fecha} venció. Requiere gestión o revisión.', 'cita_vencida', medico=True)
        _notificar(cita, 'Cita pendiente de gestión', f'La cita del {fecha} quedó vencida pendiente de gestión o revisión.', 'cita_vencida')
        return {'vencidas': 1}
    for hours, field, title, text in [
        (24, 'fecha_recordatorio_cierre_24h', 'Seguimiento pendiente', 'Debes registrar el seguimiento y completar la cita.'),
        (48, 'fecha_recordatorio_cierre_48h', 'Plazo de cierre próximo', 'Quedan 24 horas o menos para registrar el seguimiento y completar la cita.')]:
        if ahora >= cita.fecha_final + timedelta(hours=hours) and getattr(cita, field) is None:
            setattr(cita, field, ahora); cita.save(update_fields=[field])
            _notificar(cita, title, f'Cita del {fecha}: {text}', f'cierre_cita_{hours}h', medico=True)
            counts[f'recordatorios_{hours}h'] = 1
    return counts


def procesarCierreCitasService():
    totals = {'recordatorios_24h': 0, 'recordatorios_48h': 0, 'vencidas': 0}
    ids = Cita.objects.filter(fecha_limite_cierre__isnull=False,
                              fecha_final__lte=timezone.now() - timedelta(hours=24)).order_by('pk').values_list('pk', flat=True)
    for id in ids.iterator(chunk_size=200):
        for key, count in _procesarCitaCierre(id).items():
            totals[key] += count
    return totals
