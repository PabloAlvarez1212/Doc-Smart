from django.core.paginator import Paginator, EmptyPage
from django.db.models import OuterRef, Subquery, Count, Q, F, Exists, Value, Prefetch, BigIntegerField
from django.db.models.functions import Coalesce
from .access import actorVigente, identidadActor, cargarConversacionVisible
from .exceptions import ChatError
from .models import Conversacion, Mensaje, EstadoParticipante
from .services import obtenerEstadoConversacionService, citasConversacion, citaContextual
from .serializers import MensajeSerializer
from .pagination import enteroParametro


def _query(actor):
    kind, pk = identidadActor(actor)
    owner = 'medico_id' if kind == 'medico' else 'paciente_id'
    sender = 'emisor_medico_id' if kind == 'medico' else 'emisor_usuario_id'
    individual = EstadoParticipante.objects.filter(conversacion_id=OuterRef('pk'), tipo=kind)
    messages = Mensaje.objects.filter(conversacion_id=OuterRef('pk'), pk__gt=OuterRef('_corte'))
    flag = 'leido_medico' if kind == 'medico' else 'leido_paciente'
    unread = messages.filter(pk__gt=OuterRef('_cursor'), **{flag: False}).exclude(**{sender: pk})
    return Conversacion.objects.filter(canonica__isnull=True, **{owner: pk}).select_related(
        'cita__id_estado', 'cita__id_medico', 'cita__id_usuario').prefetch_related('citas_vinculadas__id_estado',
            Prefetch('mensajes', queryset=Mensaje.objects.filter(tipo='nota_previa').only('id', 'conversacion_id', 'cita_id'), to_attr='_notas_chat')).annotate(
        _corte=Coalesce(Subquery(individual.values('visible_despues_id')[:1]), Value(0), output_field=BigIntegerField()),
        _cursor=Coalesce(Subquery(individual.values('ultimo_leido_id')[:1]), Value(0), output_field=BigIntegerField()),
        _archivada=Coalesce(Subquery(individual.values('archivada')[:1]), Value(False)),
        _oculta=Coalesce(Subquery(individual.values('oculta')[:1]), Value(False)),
    ).annotate(
        ultimo_id=Subquery(messages.order_by('-pk').values('pk')[:1]),
        ultima_actividad=Coalesce(Subquery(messages.order_by('-pk').values('fecha_creacion')[:1]), F('fecha_creacion')),
        no_leidos=Coalesce(Subquery(unread.order_by().values('conversacion').annotate(n=Count('pk')).values('n')), Value(0)),
        tiene_nota_previa=Exists(messages.filter(tipo='nota_previa')),
        _leido_paciente=Coalesce(Subquery(EstadoParticipante.objects.filter(conversacion_id=OuterRef('pk'), tipo='paciente').values('ultimo_leido_id')[:1]), Value(0), output_field=BigIntegerField()),
        _leido_medico=Coalesce(Subquery(EstadoParticipante.objects.filter(conversacion_id=OuterRef('pk'), tipo='medico').values('ultimo_leido_id')[:1]), Value(0), output_field=BigIntegerField()))


def _project(conv, actor, last):
    kind, _ = identidadActor(actor)
    other = conv.cita.id_usuario if kind == 'medico' else conv.cita.id_medico
    state = obtenerEstadoConversacionService(conv)
    state = {k: v.isoformat() if hasattr(v, 'isoformat') else v for k, v in state.items()}
    cita = citaContextual(conv)
    from .message_services import citasParaNota
    notas = citasParaNota(conv) if kind == 'paciente' else []
    return dict(state, id=conv.pk, cita={'id': cita.pk, 'codigo_cita': cita.codigo_cita,
        'fecha_programada': cita.fecha_programada.isoformat(), 'fecha_final': cita.fecha_final.isoformat() if cita.fecha_final else None, 'estado': cita.id_estado.nombre},
        citas=[{'id': c.pk, 'codigo_cita': c.codigo_cita, 'fecha_programada': c.fecha_programada.isoformat(), 'fecha_final': c.fecha_final.isoformat() if c.fecha_final else None, 'estado': c.id_estado.nombre} for c in citasConversacion(conv)],
        citas_nota_previa=[{'id': c.pk, 'codigo_cita': c.codigo_cita} for c in notas],
        archivada=conv._archivada, oculta=conv._oculta, visible_despues_id=conv._corte,
        puede_deshabilitar=kind == 'medico' and state.get('puede_deshabilitar', False),
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
        no_leidos=conv.no_leidos, tiene_nota_previa=any(m.cita_id == cita.pk for m in conv._notas_chat),
        ultimo_leido_paciente=conv._leido_paciente, ultimo_leido_medico=conv._leido_medico)


def listarConversacionesService(actor, *, page=1, page_size=20, archivadas=False):
    actor = actorVigente(actor)
    if identidadActor(actor)[0] == 'medico' and not actor.esta_aprobado:
        raise ChatError(403, 'forbidden', 'Se requiere aprobación vigente')
    page, page_size = enteroParametro(page, 1), enteroParametro(page_size, 20, 50)
    if type(archivadas) is not bool:
        raise ChatError(400, 'invalid_filter', 'Filtro de archivo no válido')
    paginator = Paginator(_query(actor).filter(_oculta=False, _archivada=archivadas).order_by('-ultima_actividad', '-pk'), page_size)
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
    base, actor = cargarConversacionVisible(conversacion_id, actor)
    conv = _query(actor).get(pk=base.pk)
    last = Mensaje.objects.filter(pk=conv.ultimo_id).prefetch_related('adjuntos__archivo').first()
    return _project(conv, actor, last)


def listarMensajesService(conversacion_id, actor, *, antes_de=None, limit=50):
    conv, actor = cargarConversacionVisible(conversacion_id, actor)
    limit, before = enteroParametro(limit, 50, 100), enteroParametro(antes_de, None)
    from .participant_services import mensajesVisibles
    qs = mensajesVisibles(conv, actor)
    if before is not None:
        qs = qs.filter(pk__lt=before)
    rows = list(qs.order_by('-pk').prefetch_related('adjuntos__archivo')[:limit + 1])
    more = len(rows) > limit
    rows = rows[:limit]
    return {'results': MensajeSerializer(rows, many=True).data,
            'has_more': more, 'next_before': rows[-1].pk if more else None}
