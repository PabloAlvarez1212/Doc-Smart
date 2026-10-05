import logging
from django.db import transaction
from django.core.exceptions import ValidationError
from storage_app import services as storage
from storage_app.validators import validar_archivo_chat
from .access import cargarConversacionVisible, bloquearConversacion, identidadActor
from .exceptions import ChatError
from .models import AdjuntoConversacion
from .message_services import puedeCrearNota
from .services import puedeEscribirConversacionService

logger = logging.getLogger(__name__)
CHAT_CATEGORY = 'chat_citas_privado'


def _puede_cargar(conv, actor):
    return (puedeEscribirConversacionService(conv, actor) or
            (puedeCrearNota(conv, actor) and not conv.mensajes.filter(tipo='nota_previa').exists()))


def cargarAdjuntoConversacionService(conversacion_id, actor, archivo):
    conv, actor = cargarConversacionVisible(conversacion_id, actor)
    if not _puede_cargar(conv, actor):
        raise ChatError(403, 'forbidden', 'No puedes adjuntar archivos ahora')
    try:
        validar_archivo_chat(archivo)
    except ValidationError as exc:
        raise ChatError(400, 'invalid_file', '; '.join(exc.messages))
    kind, pk = identidadActor(actor)
    save = storage.guardar_archivo_medico if kind == 'medico' else storage.guardar_archivo_usuario
    registro = save(archivo, pk, categoria=CHAT_CATEGORY, referencia_id=conv.pk)
    try:
        with transaction.atomic():
            conv, actor = bloquearConversacion(conversacion_id, actor)
            if not _puede_cargar(conv, actor):
                raise ChatError(403, 'forbidden', 'La conversación ya no permite adjuntos')
            return AdjuntoConversacion.objects.create(conversacion=conv, archivo=registro)
    except Exception:
        try:
            if storage.eliminar_archivo(registro.storage_key):
                registro.activo = False
                registro.save(update_fields=['activo'])
            else:
                logger.error('Carga de chat pendiente de limpieza: archivo_id=%s', registro.pk)
        except Exception:
            logger.error('No se pudo compensar carga chat: archivo_id=%s', registro.pk)
        raise


def obtenerUrlAdjuntoConversacionService(conversacion_id, adjunto_id, actor):
    conv, actor = cargarConversacionVisible(conversacion_id, actor)
    adj = AdjuntoConversacion.objects.select_related('archivo').filter(pk=adjunto_id, conversacion=conv).first()
    if adj is None or not adj.archivo.activo:
        raise ChatError(404, 'not_found', 'Adjunto no encontrado')
    kind, pk = identidadActor(actor)
    owner = adj.archivo.medico_id if kind == 'medico' else adj.archivo.usuario_id
    if adj.mensaje_id is None and owner != pk:
        raise ChatError(403, 'forbidden', 'La carga todavía no fue publicada')
    url = storage.generar_url_firmada(adj.archivo.storage_key, expiracion=600,
                                     nombre_descarga=adj.archivo.nombre_original)
    if not url:
        raise ChatError(503, 'storage_unavailable', 'Archivo temporalmente no disponible')
    return {'url': url, 'expiracion': 600}


def bloquearAdjuntosParaEnvio(conversacion, actor, adjunto_ids):
    kind, pk = identidadActor(actor)
    attachments = list(AdjuntoConversacion.objects.select_for_update().filter(
        pk__in=adjunto_ids, conversacion=conversacion).order_by('pk'))
    if len(attachments) != len(adjunto_ids):
        raise ChatError(400, 'invalid_attachments', 'Adjuntos no disponibles')
    for adj in attachments:
        # Archivo después de la relación; orden estable por adjunto.
        from storage_app.models import Archivo
        archivo = Archivo.objects.select_for_update().get(pk=adj.archivo_id)
        owned = (archivo.medico_id == pk and archivo.usuario_id is None) if kind == 'medico' else (
            archivo.usuario_id == pk and archivo.medico_id is None)
        if not owned or not archivo.activo or adj.mensaje_id is not None or archivo.categoria != CHAT_CATEGORY:
            raise ChatError(400, 'invalid_attachments', 'Adjuntos no disponibles')
    return attachments
