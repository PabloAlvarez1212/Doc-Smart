from django.core.paginator import Paginator, EmptyPage
from django.db.models import OuterRef, Subquery, Count, Q, F, Exists, Value
from django.db.models.functions import Coalesce
from .access import actorVigente, identidadActor, cargarConversacionVisible
from .exceptions import ChatError
from .models import Conversacion, Mensaje
from .services import obtenerEstadoConversacionService
from .serializers import MensajeSerializer
from .pagination import enteroParametro


def _query(actor):
    kind, pk = identidadActor(actor)
    owner = 'cita__id_medico_id' if kind == 'medico' else 'cita__id_usuario_id'
    cursor = 'ultimo_leido_medico_id' if kind == 'medico' else 'ultimo_leido_paciente_id'
    sender = 'emisor_medico_id' if kind == 'medico' else 'emisor_usuario_id'
    messages = Mensaje.objects.filter(conversacion_id=OuterRef('pk'))
    unread = messages.filter(pk__gt=Coalesce(OuterRef(cursor), Value(0))).exclude(**{sender: pk})
    return Conversacion.objects.filter(**{owner: pk}).select_related(
        'cita__id_estado', 'cita__id_medico', 'cita__id_usuario').filter(
        Q(cita__id_estado__nombre__iexact='confirmada') |
        Q(cita__id_estado__nombre__iexact='reprogramada') |
        Q(cita__id_estado__nombre__iexact='completada') |
        Q(cita__id_estado__nombre__iexact='cancelada') |
        Q(cita__id_estado__nombre__iexact='inasistencia_paciente')
    ).exclude(cita__id_estado__nombre__iexact='completada', cita__fecha_final__isnull=True,
              fecha_cierre__isnull=True).annotate(
        ultimo_id=Subquery(messages.order_by('-pk').values('pk')[:1]),
        ultima_actividad=Coalesce(Subquery(messages.order_by('-pk').values('fecha_creacion')[:1]), F('fecha_creacion')),
        no_leidos=Coalesce(Subquery(unread.order_by().values('conversacion').annotate(n=Count('pk')).values('n')), Value(0)),
        tiene_nota_previa=Exists(messages.filter(tipo='nota_previa')))


def _project(conv, actor, last):
    kind, _ = identidadActor(actor)
    other = conv.cita.id_usuario if kind == 'medico' else conv.cita.id_medico
    state = obtenerEstadoConversacionService(conv)
    state = {k: v.isoformat() if hasattr(v, 'isoformat') else v for k, v in state.items()}
    return dict(state, id=conv.pk, cita={'id': conv.cita_id,
        'fecha_programada': conv.cita.fecha_programada.isoformat(), 'estado': conv.cita.id_estado.nombre},
        otro_participante={
            'id': other.pk,
            'tipo': 'paciente' if kind == 'medico' else 'medico',
            'nombre': other.nombre,
            'apellido': other.apellido,
            'foto_perfil': (
                other.foto_perfil.url
                if other.foto_perfil
                else None
            ),
        },
        ultimo_mensaje=MensajeSerializer(last).data if last else None,
        fecha_ultimo_mensaje=last.fecha_creacion.isoformat() if last else None,
        no_leidos=conv.no_leidos, tiene_nota_previa=conv.tiene_nota_previa,
        ultimo_leido_paciente=conv.ultimo_leido_paciente_id, ultimo_leido_medico=conv.ultimo_leido_medico_id)


def listarConversacionesService(actor, *, page=1, page_size=20):
    actor = actorVigente(actor)
    if identidadActor(actor)[0] == 'medico' and not actor.esta_aprobado:
        raise ChatError(403, 'forbidden', 'Se requiere aprobación vigente')
    page, page_size = enteroParametro(page, 1), enteroParametro(page_size, 20, 50)
    paginator = Paginator(_query(actor).order_by('-ultima_actividad', '-pk'), page_size)
    try:
        result = paginator.page(page)
    except EmptyPage:
        raise ChatError(400, 'invalid_pagination', 'Página fuera de rango')
    conversations = list(result.object_list)
    lasts = {m.pk: m for m in Mensaje.objects.filter(pk__in=[c.ultimo_id for c in conversations if c.ultimo_id])
             .prefetch_related('adjuntos__archivo')}
    return {'results': [_project(c, actor, lasts.get(c.ultimo_id)) for c in conversations],
        'count': paginator.count, 'next': page + 1 if result.has_next() else None,
        'previous': page - 1 if result.has_previous() else None}


def detalleConversacionService(conversacion_id, actor):
    _, actor = cargarConversacionVisible(conversacion_id, actor)
    conv = _query(actor).get(pk=conversacion_id)
    last = Mensaje.objects.filter(pk=conv.ultimo_id).prefetch_related('adjuntos__archivo').first()
    return _project(conv, actor, last)


def listarMensajesService(conversacion_id, actor, *, antes_de=None, limit=50):
    conv, actor = cargarConversacionVisible(conversacion_id, actor)
    limit, before = enteroParametro(limit, 50, 100), enteroParametro(antes_de, None)
    qs = Mensaje.objects.filter(conversacion=conv)
    if before is not None:
        qs = qs.filter(pk__lt=before)
    rows = list(qs.order_by('-pk').prefetch_related('adjuntos__archivo')[:limit + 1])
    more = len(rows) > limit
    rows = rows[:limit]
    return {'results': MensajeSerializer(rows, many=True).data,
            'has_more': more, 'next_before': rows[-1].pk if more else None}
