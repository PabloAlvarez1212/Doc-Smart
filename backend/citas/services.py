from citas.models import Cita, RecordatorioCita
from citas.serializers import CitaSerializer
from rest_framework.exceptions import NotFound, PermissionDenied
from catalogos.models import Estado
from medicos.models import Medico
from users.models import Usuario,InfoUser
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Value, Q, Prefetch
from django.db.models.functions import (Concat,TruncMonth,ExtractWeekDay,ExtractHour,TruncDay,)
from django.core.paginator import Paginator
from datetime import datetime, timedelta, timezone as dt_timezone
from functools import wraps
from notificaciones.services import enviarNotificacion
from medicos.services_disponibilidad import esHorarioDisponible
from notificaciones.email_citas_services import enviarCorreosCitaProgramada,enviarCorreosCitaConfirmada, enviarCorreosCitaReprogramada,enviarCorreosCitaCancelada,enviarCorreosCitaVencida, enviarCorreosCitaCompletada
from historial_medico.models import HistorialClinico
import logging

logger = logging.getLogger(__name__)

# Los exports de cierre se importan al final, después de definir serializar_agenda.

def serializar_agenda(funcion):
    """Todas las entradas oficiales comparten el bloqueo de agenda del médico."""
    @wraps(funcion)
    @transaction.atomic
    def protegida(*args, **kwargs):
        if funcion.__name__ == "crearCitaService":
            datos = args[0] if args else kwargs["datos"]
            medico_id = datos.get("id_medico")
        else:
            cita_id = args[0] if args else kwargs["id"]
            medico_id = Cita.objects.filter(pk=cita_id).values_list("id_medico_id", flat=True).first()
        if medico_id:
            Medico.objects.select_for_update().get(pk=medico_id)
        return funcion(*args, **kwargs)
    return protegida


# ─── CITAS ────────────────────────────────────────────────────────────────────

def listarCitasService():
    citas = Cita.objects.all().order_by('-fecha_programada')
    serializer = CitaSerializer(citas, many=True)
    return serializer.data, 200

def listarCitasPacienteService(usuario_id,busqueda=None,estado=None,ciudad=None,departamento=None,especialidad=None,fecha=None,page=None, page_size=10):
    citas = (Cita.objects
        .filter(id_usuario=usuario_id)
        .prefetch_related(
            Prefetch(
                "historialclinico_set",
                queryset=HistorialClinico.objects.only(
                    "id",
                    "cita_id",
                ),
                to_attr="historiales_vinculados",
            )
        )
    )
    
    #estado
    if estado:
        citas = citas.filter(id_estado__nombre = estado)
    #doctor
    if busqueda:
        citas = citas.annotate(
        nombre_completo=Concat(
            "id_medico__nombre",
            Value(" "),
            "id_medico__apellido"
        )
    ).filter(
        Q(nombre_completo__icontains=busqueda) | Q(codigo_cita__iexact=busqueda)
    )
    #ciudad
    if ciudad:
        citas = citas.filter(id_medico__ciudad= ciudad)
    #departamento
    if departamento:
        citas = citas.filter(id_medico__ciudad__departamento = departamento)
    #especialidad
    if especialidad:
        citas = citas.filter(id_medico__id_especialidad__nombre__icontains = especialidad)
    #fecha
    if fecha:
        fecha_obj = datetime.strptime(
            fecha,
            "%Y-%m-%d"
        ).date()

        inicio = timezone.make_aware(
            datetime.combine(
                fecha_obj,
                datetime.min.time()
            )
        )

        fin = inicio + timedelta(days=1)

        citas = citas.filter(
            fecha_programada__gte=inicio,
            fecha_programada__lt=fin
        )
    citas = citas.order_by("-fecha_programada")
    if page is None:
        serializer = CitaSerializer(citas, many=True)
    try:
        page_size = int(page_size)
    except (TypeError, ValueError):
        page_size = 10
    
    paginator = Paginator(citas, page_size)
    page_obj = paginator.get_page(page)
    serializer = CitaSerializer(page_obj.object_list, many=True)
    
    return {
            "data": serializer.data,
            "paginacion": {
                "count": paginator.count,
                "total_pages": paginator.num_pages,
                "current_page": page_obj.number,
                "page_size": page_size,
            },
        }, 200

def listarCitasMedicoService(
    medico_id,
    estado=None,
    paciente=None,
    fecha=None,
    page=None,
    page_size=10,
    seccion=None
):
    """
    Lista las citas pertenecientes al médico autenticado.

    Filtros disponibles:
    - estado
    - paciente
    - fecha_programada
    - page
    - page_size
    """

    citas = (
        Cita.objects
        .filter(id_medico_id=medico_id)
        .select_related(
            "id_estado",
            "id_usuario",
            "id_medico",
            "id_medico__ciudad",
            "id_medico__ciudad__departamento",
            "id_medico__id_especialidad",
        )
    )
    citas = citas.prefetch_related(
        Prefetch(
            "historialclinico_set",
            queryset=HistorialClinico.objects.only(
                "id",
                "cita_id",
            ),
            to_attr="historiales_vinculados",
        )
    )

    #FILTRAR AGENDA O HISTORIAL
    estados_por_seccion = {
        "agenda": (
            "pendiente",
            "confirmada",
            "reprogramada",
        ),
        "historial": (
            "completada",
            "cancelada",
            "vencida",
            "inasistencia_paciente",
        ),
    }

    if seccion is not None:

        if not isinstance(seccion, str):
            return "La sección solicitada no es válida", 400

        seccion = seccion.strip().lower()

        if seccion not in estados_por_seccion:
            return "La sección debe ser agenda o historial", 400

        filtro_estados = Q()

        for nombre_estado in estados_por_seccion[seccion]:
            filtro_estados |= Q(
                id_estado__nombre__iexact=nombre_estado
            )

        citas = citas.filter(filtro_estados)


    # ==========================================
    # ESTADO
    # ==========================================

    if estado and estado.lower() != "todas":
        citas = citas.filter(
            id_estado__nombre__iexact=estado
        )


    # ==========================================
    # PACIENTE
    # ==========================================

    if paciente:
        paciente = paciente.strip()

        citas = (
            citas
            .annotate(
                nombre_completo=Concat(
                    "id_usuario__nombre",
                    Value(" "),
                    "id_usuario__apellido"
                )
            )
            .filter(
                Q(
                    nombre_completo__icontains=paciente
                )
                |
                Q(
                    id_usuario__nombre__icontains=paciente
                )
                |
                Q(
                    id_usuario__apellido__icontains=paciente
                )
                |
                Q(
                    id_usuario__correo__icontains=paciente
                )
                |
                Q(
                    id_usuario__cedula__icontains=paciente
                )
            )
        )


    # ==========================================
    # FECHA
    # ==========================================

    if fecha:
        try:
            fecha_obj = datetime.strptime(
                fecha,
                "%Y-%m-%d"
            ).date()

        except ValueError:
            return (
                "La fecha debe tener el formato YYYY-MM-DD",
                400
            )

        inicio = timezone.make_aware(
            datetime.combine(
                fecha_obj,
                datetime.min.time()
            )
        )

        fin = inicio + timedelta(days=1)

        citas = citas.filter(
            fecha_programada__gte=inicio,
            fecha_programada__lt=fin
        )


    # ==========================================
    # ORDEN
    # ==========================================

    citas = citas.order_by(
        "-fecha_programada"
    )


    # ==========================================
    # PAGINACIÓN
    # ==========================================

    try:
        page_size = int(page_size)

    except (TypeError, ValueError):
        page_size = 10


    # Evitamos tamaños inválidos o exagerados
    page_size = max(
        1,
        min(page_size, 50)
    )


    paginator = Paginator(
        citas,
        page_size
    )

    page_obj = paginator.get_page(
        page or 1
    )


    serializer = CitaSerializer(
        page_obj.object_list,
        many=True
    )


    return {
        "data": serializer.data,

        "paginacion": {
            "count": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "page_size": page_size,
        }

    }, 200

def resumenCitasMedicoService(medico_id):

    # ==========================================
    # QUERY BASE
    # ==========================================

    citas = (
        Cita.objects
        .filter(id_medico_id=medico_id)
        .select_related(
            "id_estado",
            "id_usuario"
        )
    )


    # ==========================================
    # RANGO DEL DÍA ACTUAL
    # ==========================================

    hoy = timezone.localdate()

    inicio_dia = timezone.make_aware(
        datetime.combine(
            hoy,
            datetime.min.time()
        )
    )

    fin_dia = inicio_dia + timedelta(days=1)


    # ==========================================
    # ESTADÍSTICAS
    # ==========================================

    resumen = citas.aggregate(

        total=Count("id"),

        citas_hoy=Count(
            "id",
            filter=(
                Q(
                    fecha_programada__gte=inicio_dia,
                    fecha_programada__lt=fin_dia
                )
                &
                ~Q(
                    id_estado__nombre__iexact="cancelada"
                )
            )
        ),

        pendientes=Count(
            "id",
            filter=Q(
                id_estado__nombre__iexact="pendiente"
            )
        ),
        
        vencidas=Count(
            "id",
            filter=Q(
                id_estado__nombre__iexact="vencida"
            )
        ),

        confirmadas=Count(
            "id",
            filter=Q(
                id_estado__nombre__iexact="confirmada"
            )
        ),

        reprogramadas=Count(
            "id",
            filter=Q(
                id_estado__nombre__iexact="reprogramada"
            )
        ),

        completadas=Count(
            "id",
            filter=Q(
                id_estado__nombre__iexact="completada"
            )
        ),

        canceladas=Count(
            "id",
            filter=Q(
                id_estado__nombre__iexact="cancelada"
            )
        ),

        inasistencias = Count(
            "id",
            filter = Q(
                id_estado__nombre__iexact = "inasistencia_paciente"
            )
        ),
    )


    # ==========================================
    # PRÓXIMA CITA
    # ==========================================

    ahora = timezone.now()

    proxima_cita = (
        citas
        .filter(
            fecha_programada__gte=ahora
        )
        .exclude(
            Q(
                id_estado__nombre__iexact="cancelada"
            )
            |
            Q(
                id_estado__nombre__iexact="completada"
            )
        )
        .order_by(
            "fecha_programada"
        )
        .first()
    )


    # ==========================================
    # SERIALIZAR PRÓXIMA CITA
    # ==========================================

    proxima_data = None

    if proxima_cita:

        cita_serializada = CitaSerializer(
            proxima_cita
        ).data

        proxima_data = {
            "id": cita_serializada["id"],

            "fecha_programada":
                cita_serializada["fecha_programada"],

            "fecha_final":
                cita_serializada["fecha_final"],

            "estado":
                cita_serializada["estado"],

            "paciente":
                cita_serializada["paciente"],

            "foto_paciente":
                cita_serializada["foto_paciente"],
        }


    # ==========================================
    # RESPUESTA
    # ==========================================

    return {
        "total": resumen["total"],

        "citas_hoy": resumen["citas_hoy"],

        "pendientes": resumen["pendientes"],
        
        "vencidas": resumen["vencidas"],

        "confirmadas": resumen["confirmadas"],

        "reprogramadas": resumen["reprogramadas"],

        "completadas": resumen["completadas"],

        "canceladas": resumen["canceladas"],

        "inasistencias": resumen["inasistencias"],

        "proxima_cita": proxima_data,
    }, 200


def obtenerCitaService(id, solicitante):
    cita = Cita.objects.filter(id=id).first()
    if not cita:
        return 'Cita no encontrada', 404
    if isinstance(solicitante, Usuario):
        if cita.id_usuario_id != solicitante.id:
            return 'No tienes permiso para ver esta cita', 403
    elif isinstance(solicitante, Medico):
        if cita.id_medico_id != solicitante.id:
            return 'No tienes permiso para ver esta cita', 403
    else:
        return 'No tienes permiso para ver esta cita', 403
    serializer = CitaSerializer(cita)
    return serializer.data, 200

@serializar_agenda
def crearCitaService(
    datos,
    usuario_id
):
    usuario = (
        Usuario.objects
        .filter(id=usuario_id)
        .first()
    )

    if not usuario:

        medico_logueado = (
            Medico.objects
            .filter(id=usuario_id)
            .first()
        )

        if medico_logueado:
            return (
                "Solo pacientes pueden crear citas",
                400
            )

        return "El usuario no existe", 404

    medico = (
        Medico.objects
        .filter(id=datos["id_medico"])
        .first()
    )

    if not medico:
        return "Médico no encontrado", 404

    fecha_programada = datos["fecha_programada"]
    ahora = timezone.now()

    # 1. Anticipación mínima
    if fecha_programada < ahora + timedelta(hours=1):
        return (
            "La cita debe programarse con "
            "al menos 1 hora de anticipación",
            400
        )

    # 2. Validar disponibilidad real
    if not esHorarioDisponible(
        medico,
        fecha_programada
    ):
        return (
            "El horario seleccionado ya no "
            "está disponible",
            400
        )

    # 3. Calcular fecha final
    fecha_final = (
        fecha_programada
        + timedelta(
            minutes=medico.duracion_consulta
        )
    )

    # 4. Límite para que el médico confirme.
    #
    # Tiene máximo 24 horas desde la solicitud.
    # Si la cita ocurre antes de esas 24 horas,
    # el límite será la propia fecha programada.
    fecha_limite_confirmacion = min(
        ahora + timedelta(hours=24),
        fecha_programada
    )

    # 5. Límite posterior para cerrar la consulta
    fecha_limite_cierre = (
        fecha_final
        + timedelta(hours=72)
    )

    # 6. Estado inicial
    estado = (
        Estado.objects
        .filter(nombre__iexact="pendiente")
        .first()
    )

    if not estado:
        return (
            "Estado pendiente no configurado",
            500
        )

    motivo_consulta = datos["motivo_consulta"]

    # 7. Crear cita
    cita = Cita.objects.create(
        fecha_programada=fecha_programada,
        fecha_final=fecha_final,
        fecha_limite_confirmacion=fecha_limite_confirmacion,
        fecha_limite_cierre=fecha_limite_cierre,
        id_usuario_id=usuario_id,
        id_medico=medico,
        id_estado=estado,
        motivo_consulta=motivo_consulta
    )

    fecha_fmt = (
        timezone.localtime(cita.fecha_programada)
        .strftime(
            "%d/%m/%Y a las %H:%M"
        )
    )

    limite_confirmacion_fmt = (
        timezone.localtime(
            cita.fecha_limite_confirmacion
        )
        .strftime(
            "%d/%m/%Y a las %H:%M"
        )
    )

    cita_data = CitaSerializer(
        cita
    ).data

    # 8. Notificación paciente
    enviarNotificacion(
        titulo="Cita solicitada",
        mensaje=(
            f"Tu cita con el Dr. "
            f"{cita.id_medico.nombre} "
            f"{cita.id_medico.apellido} "
            f"para el {fecha_fmt} fue solicitada "
            f"correctamente. Está pendiente de "
            f"confirmación por parte del médico."
        ),
        tipo="cita_pendiente",
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "NUEVA_SOLICITUD",
            "cita": cita_data
        }
    )

    # 9. Notificación médico
    enviarNotificacion(
        titulo="Nueva solicitud de cita",
        mensaje=(
            f"El paciente "
            f"{cita.id_usuario.nombre} "
            f"{cita.id_usuario.apellido} "
            f"ha solicitado una cita para "
            f"el {fecha_fmt}. "
            f"Debes confirmarla antes del "
            f"{limite_confirmacion_fmt}."
        ),
        tipo="nueva_solicitud",
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "NUEVA_SOLICITUD",
            "cita": cita_data
        }
    )

    transaction.on_commit(
        lambda cita_id=cita.id: enviarCorreosCitaProgramada(
            cita_id
        ),
        robust=True,
    )
    
    return cita_data, 201


@serializar_agenda
def editarCitaService(id, datos, solicitante):
    if isinstance(solicitante, Usuario):
        cita = Cita.objects.select_for_update().filter(
            id=id,
            id_usuario=solicitante.id
        ).first()

    elif isinstance(solicitante, Medico):
        cita = Cita.objects.select_for_update().filter(
            id=id,
            id_medico=solicitante.id
        ).first()

    else:
        return 'No tienes permiso para editar esta cita', 403

    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    if cita.id_estado.nombre.lower() == 'inasistencia_paciente':
        return 'No se puede editar una cita con inasistencia del paciente', 400

    if cita.id_estado.nombre.lower() in [
        'cancelada',
        'completada',
        'vencida',
    ]:
        return (
            'No se puede editar una cita cancelada, '
            'completada o vencida',
            400
        )
    # ==========================================
    # VALIDAR CICLO DE VIDA DE LA CITA
    # ==========================================

    estado_actual = cita.id_estado.nombre.strip().lower()
    ahora = timezone.now()

    # Impedir reprogramar solicitudes cuyo
    # plazo de confirmación ya expiró.
    if estado_actual in ('pendiente', 'reprogramada'):

        limite_confirmacion = cita.fecha_limite_confirmacion

        # Compatibilidad con citas antiguas
        # que no tengan fecha límite registrada.
        if limite_confirmacion is None:
            limite_confirmacion = min(
                cita.fecha_creacion + timedelta(hours=24),
                cita.fecha_programada
            )

        if (
            ahora >= limite_confirmacion
            or ahora >= cita.fecha_programada
        ):
            return (
                'El plazo de confirmación de esta cita '
                'ha vencido. No se puede reprogramar.',
                400
            )

    # Una consulta confirmada que ya comenzó
    # no debe reprogramarse como una nueva solicitud.
    if (
        estado_actual == 'confirmada'
        and ahora >= cita.fecha_programada
    ):
        return (
            'No se puede reprogramar una cita '
            'confirmada que ya ha comenzado.',
            400
        )
    fecha_antigua = cita.fecha_programada
    nueva_fecha = datos.get('fecha_programada')

    # Validar que se proporcione una nueva fecha
    if nueva_fecha is None:
        return 'Debes proporcionar una nueva fecha para reprogramar la cita', 400

    # Evitar reprogramar con la misma fecha
    if nueva_fecha == fecha_antigua:
        return 'La nueva fecha debe ser diferente a la fecha actual', 400

    if timezone.is_naive(nueva_fecha):
        return 'La fecha programada debe incluir zona horaria', 400
    
    if nueva_fecha < timezone.now() + timedelta(hours=1):
        return 'La cita debe programarse con al menos 1 hora de anticipación', 400

    if not esHorarioDisponible(cita.id_medico, nueva_fecha, excluir_cita_id=cita.pk):
        return 'El horario seleccionado ya no está disponible', 400

    ahora = timezone.now()
    cita.fecha_programada = nueva_fecha
    cita.fecha_final = (nueva_fecha+ timedelta(minutes=cita.id_medico.duracion_consulta))

    # Reinicia el plazo de confirmación.
    # El médico tiene máximo 24 horas desde la reprogramación,
    # pero nunca más allá del inicio de la cita.
    cita.fecha_limite_confirmacion = min(ahora + timedelta(hours=24),nueva_fecha)

    # Reinicia el límite posterior para cerrar la consulta
    cita.fecha_limite_cierre = (cita.fecha_final+ timedelta(hours=72))

    # Reiniciar estados temporales relacionados con la fecha anterior
    cita.fecha_recordatorio_cierre_24h = None
    cita.fecha_recordatorio_cierre_48h = None
    cita.fecha_vencimiento = None

    estado_reprogramado = (Estado.objects.filter(nombre__iexact='reprogramada').first())

    if not estado_reprogramado:
        return "Estado 'Reprogramada' no configurado", 404

    cita.id_estado = estado_reprogramado

    cita.save()

    # Cancelar recordatorios pendientes de la programación anterior.
    RecordatorioCita.objects.filter(
        id_cita=cita,
        estado_envio__in=["pendiente", "fallido"]
    ).update(
        estado_envio="cancelado"
    )

    if nueva_fecha and nueva_fecha != fecha_antigua:
        from chat_citas.services import reiniciarConversacionPorReprogramacionService

        reiniciarConversacionPorReprogramacionService(cita)
        from uuid import uuid4
        from chat_citas.event_services import registrarEventoConversacionService
        registrarEventoConversacionService(cita, clave=f'reprogramada:{uuid4()}',
            evento='cita_reprogramada', instante=timezone.now(), metadata={
                'fecha_anterior': fecha_antigua.isoformat(), 'fecha_nueva': nueva_fecha.isoformat()})

        fecha_fmt = timezone.localtime(
            cita.fecha_programada
        ).strftime(
            "%d/%m/%Y a las %H:%M"
        )

        limite_confirmacion_fmt = (timezone.localtime(cita.fecha_limite_confirmacion).strftime("%d/%m/%Y a las %H:%M"))

        cita_data = CitaSerializer(cita).data

        enviarNotificacion(
            titulo='Cita reprogramada',
            mensaje=(
                f'Tu cita con el Dr. '
                f'{cita.id_medico.nombre} '
                f'{cita.id_medico.apellido} '
                f'fue reprogramada para el {fecha_fmt} hs.'
            ),
            tipo='cita_reprogramada',
            id_usuario=cita.id_usuario_id,
            extra_data={
                "tipo_evento": "ACTUALIZACION_CITA",
                "cita": cita_data
            }
        )

        enviarNotificacion(
            titulo='Cita reprogramada',
            mensaje=(
                f'La cita con el paciente '
                f'{cita.id_usuario.nombre} '
                f'{cita.id_usuario.apellido} '
                f'fue reprogramada para el {fecha_fmt}. '
                f'Debes confirmarla antes del '
                f'{limite_confirmacion_fmt}.'
            ),
            tipo='cita_reprogramada',
            id_medico=cita.id_medico_id,
            extra_data={
                "tipo_evento": "ACTUALIZACION_CITA",
                "cita": cita_data
            })

        transaction.on_commit(
            lambda cita_id=cita.id, fecha_anterior=fecha_antigua: (
                enviarCorreosCitaReprogramada(
                    cita_id,
                    fecha_anterior
                )
            ),
            robust=True,
        )
        
    return CitaSerializer(cita).data, 200

@serializar_agenda
def cancelarCitaService(id, solicitante, motivo_cancelacion=None):
    cita = Cita.objects.select_for_update().filter(
        id=id
    ).first()

    if not cita:
        return 'Cita no encontrada', 404

    if isinstance(solicitante, Usuario):
        autorizado = (
            cita.id_usuario_id == solicitante.id
        )

    elif isinstance(solicitante, Medico):
        autorizado = (
            cita.id_medico_id == solicitante.id
        )

    else:
        autorizado = False

    if not autorizado:
        return 'No tienes permiso para cancelar esta cita', 403
    
    # Identificar quién está cancelando la cita
    cancelada_por = (
        "medico"
        if isinstance(solicitante, Medico)
        else "paciente"
    )

    if motivo_cancelacion is not None:
        if not isinstance(motivo_cancelacion, str):
            return("El motivo de cancelación debe ser un texto", 400)
        motivo_cancelacion = motivo_cancelacion.strip()
        if not motivo_cancelacion:
            return("El motivo de cancelación no puede estar vacío", 400)
        if len(motivo_cancelacion) > 500:
            return("El motivo de cancelación no puede superar los 500 caracteres", 400)

    estado_actual = cita.id_estado.nombre.strip().lower()

    if estado_actual == 'inasistenccia_paciente':
        return(
            'No se puede cancelar una cita con inasistencia del paciente', 400
        )

    if estado_actual == 'cancelada':
        return(
            'La cita ya está cancelada', 400
        )

    if estado_actual == 'completada':
        return(
            'No se puede cancelar una cita completada', 400
        )

    if estado_actual == 'vencida':
        return (
        'No se puede cancelar una cita vencida', 400
        )
    # SOLO LOS ESTADOS ACTIVOS ADMITEN CANCELACIÓN
    if estado_actual not in ('pendiente', 'confirmada', 'reprogramada'):
        return('El estado actual de la cita no permite cancelarla', 400)
    estado_cancelada = Estado.objects.filter(
        nombre__iexact='cancelada'
    ).first()
    if not estado_cancelada:
        return "Estado 'cancelada' no configurado", 500

    cita.id_estado = estado_cancelada
    cita.fecha_cancelacion = timezone.now()
    cita.motivo_cancelacion = motivo_cancelacion
    cita.cancelada_por = cancelada_por
    cita.save(
        update_fields=[
            "id_estado", "fecha_cancelacion", "motivo_cancelacion", "cancelada_por"
        ]
    )

    from chat_citas.services import cerrarConversacionPorCancelacionService

    cerrarConversacionPorCancelacionService(cita)
    from chat_citas.event_services import registrarEventoConversacionService
    registrarEventoConversacionService(cita, clave=f'cancelada:{cita.fecha_cancelacion.isoformat()}',
        evento='cita_cancelada', instante=cita.fecha_cancelacion,
        metadata={'actor': {'tipo': 'medico' if isinstance(solicitante, Medico) else 'paciente', 'id': solicitante.pk}})

    fecha_fmt = timezone.localtime(cita.fecha_programada).strftime(
        "%d/%m/%Y a las %H:%M"
    )

    cita_data = CitaSerializer(cita).data

    enviarNotificacion(
        titulo='Cita cancelada',
        mensaje=(
            f'Tu cita con el Dr. '
            f'{cita.id_medico.nombre} '
            f'{cita.id_medico.apellido} '
            f'del {fecha_fmt} ha sido cancelada.'
        ),
        tipo='cita_cancelada',
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    enviarNotificacion(
        titulo='Cita cancelada',
        mensaje=(
            f'Tu cita con el paciente '
            f'{cita.id_usuario.nombre} '
            f'{cita.id_usuario.apellido} '
            f'del {fecha_fmt} ha sido cancelada.'
        ),
        tipo='cita_cancelada',
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    
    transaction.on_commit(
        lambda cita_id=cita.id, actor=cancelada_por: (
            enviarCorreosCitaCancelada(
                cita_id,
                actor
            )
        ),
        robust=True,
    )

    return 'Cita cancelada correctamente', 200

@serializar_agenda
def completarCitaService(id, medico_id, datos_historial):
    cita = Cita.objects.select_for_update().filter(id=id, id_medico=medico_id).first()
    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    estado_actual = cita.id_estado.nombre.strip().lower()
    if estado_actual == 'inasistencia_paciente':
        return ('No se puede completar una cita con inasistencia del paciente', 400)

    # SOLAMENTE SE PUEDE COMPLETAR CONSULTAS PREVIAMENTE CONFIRMADAS.
    if estado_actual != 'confirmada':
        return ('Solo se puede completar citas previamente confirmadas', 400)
    
    from .cierre_services import validarVentanaCierre
    if not cita.id_medico.esta_aprobado or cita.id_medico.id_rol.nombre.lower() == 'admin':
        return 'Se requiere aprobación médica vigente', 403
    ahora = timezone.now()
    error = validarVentanaCierre(cita, ahora)
    if error:
        return error
    if not cita.documentos_seguimiento.filter(archivo__activo=True).exists():
        return 'Debes registrar al menos un documento de seguimiento antes de completar la cita', 400

    estado_completada = Estado.objects.filter(nombre__iexact='completada').first()
    if not estado_completada:
        return "Estado 'completada' no configurado", 500
    from historial_medico.serializers import CrearHistorialSerializer
    serializer_historial = CrearHistorialSerializer(data={**datos_historial, 'cita_id': cita.pk})
    if not serializer_historial.is_valid():
        return serializer_historial.errors, 400
    from historial_medico.services import (crearHistorialDesdeCierreService,)
    historial, status_historial = (
        crearHistorialDesdeCierreService(
            cita=cita,
            medico=cita.id_medico,
            datos=serializer_historial.validated_data,
        )
    )
    if status_historial != 201:
        return (
            historial,
            status_historial
        )
    cita.id_estado    = estado_completada
    cita.fecha_completada = ahora
    cita.save()

    from chat_citas.event_services import registrarEventoConversacionService
    registrarEventoConversacionService(
        cita,
        clave=f'completada:{cita.fecha_completada.isoformat()}',
        evento='cita_completada',
        instante=cita.fecha_completada,
        metadata={
            'documentos_editables_hasta': (
                cita.fecha_limite_cierre.isoformat()
                if cita.fecha_limite_cierre
                else None
            )
        }
    )
    fecha_fmt = timezone.localtime(cita.fecha_programada).strftime("%d/%m/%Y a las %H:%M")
    cita_data = CitaSerializer(cita).data
    enviarNotificacion(
        titulo='Consulta finalizada',
        mensaje=f'Tu consulta con el Dr. {cita.id_medico.nombre} {cita.id_medico.apellido} del {fecha_fmt} fue completada. Ya existe documentación de seguimiento de la consulta.',
        tipo='cita_completada', 
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    enviarNotificacion(
        titulo='Consulta finalizada',
        mensaje=f'Tu consulta con el paciente {cita.id_usuario.nombre} {cita.id_usuario.apellido} del {fecha_fmt} ha finalizado.',
        tipo='cita_completada', 
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    
    transaction.on_commit(
        lambda cita_id=cita.id: enviarCorreosCitaCompletada(
            cita_id
        ),
        robust=True,
    )

    return cita_data, 200

@serializar_agenda
def marcarInasistenciaPacienteService(id, solicitante):
    """Acción clínica explícita; recibe al actor autenticado, nunca un ID de actor."""
    if not isinstance(solicitante, Medico) or not solicitante.is_authenticated:
        return 'Solo el médico propietario aprobado puede marcar inasistencia del paciente', 403

    cita = Cita.objects.select_for_update().filter(pk=id).first()
    if cita is None:
        return 'Cita no encontrada', 404

    # La agenda del propietario está bloqueada por serializar_agenda.
    # Leer aprobación y rol vigentes, no confiar en relaciones cacheadas del actor.
    medico = cita.id_medico
    if (medico.pk != solicitante.pk or medico.id_rol.nombre.lower() == 'admin'
            or not medico.esta_aprobado):
        return 'Solo el médico propietario aprobado puede marcar inasistencia del paciente', 403

    estado_actual = cita.id_estado.nombre.strip().lower()

    if (estado_actual != 'confirmada' or cita.fecha_inasistencia is not None):
        return('Solo se puede registrar inasistencia en citas previamente confirmadas', 400)

    ahora = timezone.now()
    if timezone.is_naive(ahora) or timezone.is_naive(cita.fecha_programada):
        return 'La transición requiere fechas con zona horaria', 400
    if ahora.astimezone(dt_timezone.utc) < cita.fecha_programada.astimezone(dt_timezone.utc):
        return 'No se puede marcar inasistencia antes del inicio programado', 400

    estado = Estado.objects.filter(nombre__iexact='inasistencia_paciente').first()
    if estado is None:
        return "Estado 'inasistencia_paciente' no configurado", 500

    cita.id_estado = estado
    cita.fecha_inasistencia = ahora
    cita.save(update_fields=['id_estado', 'fecha_inasistencia'])

    from chat_citas.services import cerrarConversacionPorInasistenciaPacienteService

    cerrarConversacionPorInasistenciaPacienteService(cita)
    from chat_citas.event_services import registrarEventoConversacionService
    registrarEventoConversacionService(cita, clave=f'inasistencia:{ahora.isoformat()}',
        evento='inasistencia_paciente', instante=ahora, metadata={})
    from citas.realtime import programarActualizacionCitaRealtime
    programarActualizacionCitaRealtime(cita)
    return CitaSerializer(cita).data, 200


@serializar_agenda
def confirmarCitaService(id, medico_id):
    
    cita = (
        Cita.objects
        .select_for_update()
        .filter(
            id=id,
            id_medico=medico_id
        )
        .first()
    )

    if not cita:
        return 'Cita no encontrada o no te pertenece', 404

    estado_actual = cita.id_estado.nombre.strip().lower()
    ahora = timezone.now()

    # Estados que nunca pueden confirmarse
    if estado_actual == 'vencida':
        return 'No se puede confirmar una cita vencida', 400

    if estado_actual == 'inasistencia_paciente':
        return (
            'No se puede confirmar una cita con '
            'inasistencia del paciente',
            400
        )

    if estado_actual == 'confirmada':
        return 'La cita ya está confirmada', 400

    if estado_actual == 'cancelada':
        return 'No se puede confirmar una cita cancelada', 400

    if estado_actual == 'completada':
        return 'No se puede confirmar una cita completada', 400

    # Solo una solicitud pendiente o reprogramada
    # puede pasar a confirmada.
    if estado_actual not in (
        'pendiente',
        'reprogramada',
    ):
        return (
            'El estado actual de la cita '
            'no permite confirmarla',
            400
        )

    # Compatibilidad con citas antiguas creadas antes
    # de agregar fecha_limite_confirmacion.
    limite_confirmacion = cita.fecha_limite_confirmacion

    if limite_confirmacion is None:

        limite_confirmacion = min(
            cita.fecha_creacion + timedelta(hours=24),
            cita.fecha_programada
        )

        cita.fecha_limite_confirmacion = limite_confirmacion

        cita.save(
            update_fields=[
                'fecha_limite_confirmacion'
            ]
        )

    # El médico perdió el plazo para confirmar.
    if ahora >= limite_confirmacion:
        return (
            'El plazo para confirmar esta cita ha vencido',
            400
        )

    # Protección adicional:
    # nunca confirmar una cita cuya hora ya pasó.
    if ahora >= cita.fecha_programada:
        return (
            'No se puede confirmar una cita '
            'cuya fecha ya venció',
            400
        )

    estado_confirmada = (
        Estado.objects
        .filter(
            nombre__iexact='confirmada'
        )
        .first()
    )

    if not estado_confirmada:
        return (
            "No existe el estado 'confirmada' "
            "en el catálogo",
            404
        )

    cita.id_estado = estado_confirmada

    cita.save(
        update_fields=[
            'id_estado'
        ]
    )

    from chat_citas.services import prepararConversacionService

    resultado_chat, codigo_chat = (
        prepararConversacionService(
            cita.pk
        )
    )

    if codigo_chat not in (200, 201):
        raise RuntimeError(
            f'No se pudo preparar la conversación: '
            f'{resultado_chat}'
        )

    fecha_fmt = (
        timezone.localtime(
            cita.fecha_programada
        )
        .strftime(
            "%d/%m/%Y a las %H:%M"
        )
    )

    cita_data = CitaSerializer(
        cita
    ).data

    enviarNotificacion(
        titulo='Cita confirmada',
        mensaje=(
            f'Tu cita del {fecha_fmt} '
            f'ha sido confirmada por el '
            f'Dr. {cita.id_medico.nombre} '
            f'{cita.id_medico.apellido}'
        ),
        tipo='cita_confirmada',
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )

    enviarNotificacion(
        titulo='Cita confirmada',
        mensaje=(
            f'Confirmaste la cita con el paciente '
            f'{cita.id_usuario.nombre} '
            f'{cita.id_usuario.apellido} '
            f'para el {fecha_fmt}'
        ),
        tipo='cita_confirmada',
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data
        }
    )
    
    transaction.on_commit(
        lambda cita_id=cita.id: enviarCorreosCitaConfirmada(
            cita_id
        ),
        robust=True,
    )

    return cita_data, 200
# ─── RECORDATORIOS ────────────────────────────────────────────────────────────

#!Service para estadisticas del modulo citas

def obtenerEstadisticasCitas(anio=None, mes=None):
    cancelacion_invalida = Q(
        id_estado__nombre__iexact="cancelada",
        fecha_cancelacion__isnull=True,
    )

    citas = Cita.objects.exclude(cancelacion_invalida)
    citasCreadas = Cita.objects.exclude(cancelacion_invalida)
    
    if anio is not None:
        citas = citas.filter(fecha_programada__year=anio)
        citasCreadas = citasCreadas.filter(fecha_creacion__year=anio)

    if mes is not None:
        citas = citas.filter(fecha_programada__month=mes)
        citasCreadas = citasCreadas.filter(fecha_creacion__month=mes)
        
    citaPorEstado = citas.values('id_estado__nombre').annotate(total=Count('id')).order_by('-total')
    citasCreadasPorEstado = (citasCreadas.values("id_estado__nombre").annotate(total=Count("id")).order_by("-total"))
    
    if mes is not None:
        citaPorPeriodo = (Cita.objects.filter(fecha_creacion__year=anio,fecha_creacion__month=mes).annotate(dia=TruncDay("fecha_creacion")).values("dia").annotate(total=Count("id")).order_by("dia"))
        
        agrupacion = "dia"
        
    else:
        citaPorPeriodo = (Cita.objects.filter(fecha_creacion__year=anio).annotate(mes=TruncMonth("fecha_creacion")).values("mes").annotate(total=Count("id")).order_by("mes"))

        agrupacion = "mes"
        
    citaPorEspecialidad = citas.values('id_medico__id_especialidad__nombre').annotate(total=Count('id')).order_by('-total')
    citasCreadasPorEspecialidad = (citasCreadas.values("id_medico__id_especialidad__nombre").annotate(total=Count("id")).order_by("-total"))
    citaPorDiaSemana = citas.annotate(dia_semana = ExtractWeekDay("fecha_programada")).values("dia_semana").annotate(total=Count("id")).order_by("dia_semana")
    citasPorHora = (citas.annotate(hora=ExtractHour("fecha_programada")).values("hora").annotate(total=Count("id")).order_by("hora"))  
    ordenDias = [
        (2, "Lunes"),
        (3, "Martes"),
        (4, "Miércoles"),
        (5, "Jueves"),
        (6, "Viernes"),
        (7, "Sábado"),
        (1, "Domingo"),
    ]
    
    totalesPorDia = {
        item["dia_semana"]: item["total"]
        for item in citaPorDiaSemana
    }
    
    citasPorPeriodoData = []
        
    for item in citaPorPeriodo:
        if agrupacion == "dia":
            citasPorPeriodoData.append({
                "periodo": item["dia"].strftime("%Y-%m-%d"),
                "total": item["total"]
            })
        else:
            citasPorPeriodoData.append({
                "periodo": item["mes"].strftime("%Y-%m"),
                "total": item["total"]
            })
            
    aniosDisponibles = (Cita.objects.dates("fecha_programada", "year", order="DESC"))
    
    aniosDisponibles = [
        fecha.year
        for fecha in aniosDisponibles
    ]
    
    data = {
        "citas_por_estado" : [],
        "citas_creadas_por_estado": [],
        "citas_por_periodo" : [],
        "citas_por_especialidad" : [],
        "citas_creadas_por_especialidad": [],
        "citas_por_dia_semana" : [],
        "citas_por_hora": [],
        "citas_creadas_por_periodo": {
            "agrupacion": agrupacion,
            "datos": citasPorPeriodoData
        },
        "filtros": {
            "anio": anio,
            "mes": mes,
            "anios_disponibles": aniosDisponibles
        },
    }
                
    #citas
    for item in citaPorEstado:
        data["citas_por_estado"].append({
            "estado" : item['id_estado__nombre'],
            "total" : item['total']
        })
    
    for item in citasCreadasPorEstado:
        data["citas_creadas_por_estado"].append({
            "estado": item["id_estado__nombre"],
            "total": item["total"]
        })   
   
    for item in citaPorEspecialidad:
        data["citas_por_especialidad"].append({
            "especialidad" : item['id_medico__id_especialidad__nombre'],
            "total_citas" : item["total"]
        })
    
    for item in citasCreadasPorEspecialidad:
        data["citas_creadas_por_especialidad"].append({
            "especialidad": item["id_medico__id_especialidad__nombre"],
            "total_citas": item["total"]
        })
        
    for numero, nombre in ordenDias:
        data["citas_por_dia_semana"].append({
            "dia": nombre,
            "total_citas": totalesPorDia.get(numero, 0)
        })
    
    for item in citasPorHora:
        data["citas_por_hora"].append({
            "hora": f"{item['hora']:02d}:00",
            "total_citas": item["total"]
        })
        
    return data,200


from .cierre_services import subirDocumentosCitaService, procesarCierreCitasService
def obtenerInfoPacienteCitaService(medico, cita_id):
    if not isinstance(medico, Medico):
        raise PermissionDenied("Esta función es exclusiva para médicos.")

    cita = Cita.objects.select_related(
        "id_usuario", "id_estado"
    ).filter(pk=cita_id, id_medico=medico).first()

    if not cita:
        raise NotFound("Cita no encontrada.")

    if cita.id_estado.nombre.strip().casefold() != "confirmada":
        raise PermissionDenied("Debes confirmar la cita para consultar estos datos.")

    paciente = cita.id_usuario
    registros = InfoUser.objects.filter(
        id_usuario=paciente
    ).select_related("id_tipo")

    return paciente, registros

def obtenerCitasPendientesVencidasService():

    ahora = timezone.now()

    estados_pendientes = (
        Q(id_estado__nombre__iexact="pendiente")
        | Q(id_estado__nombre__iexact="reprogramada")
    )

    # Solicitudes con fecha límite registrada y vencida.
    limite_vencido = Q(
        fecha_limite_confirmacion__lte=ahora
    )

    # Compatibilidad con solicitudes pendientes antiguas
    # que no tienen fecha límite registrada.
    pendientes_antiguas = (
        Q(id_estado__nombre__iexact="pendiente")
        & Q(fecha_limite_confirmacion__isnull=True)
        & (
            Q(fecha_creacion__lte=ahora - timedelta(hours=24))
            | Q(fecha_programada__lte=ahora)
        )
    )

    return (
        Cita.objects
        .filter(
            estados_pendientes
            & (limite_vencido | pendientes_antiguas)
        )
        .order_by("fecha_limite_confirmacion", "id")
    )


@serializar_agenda
def vencerCitaPorFaltaConfirmacionService(id):
    cita = (
        Cita.objects
        .select_for_update()
        .select_related(
            "id_estado",
            "id_usuario",
            "id_medico",
        )
        .filter(pk=id)
        .first()
    )

    if not cita:
        return "Cita no encontrada", 404

    estado_actual = cita.id_estado.nombre.strip().lower()

    # Solo las citas pendientes o reprogramadas
    # pueden vencer por falta de confirmación.
    if estado_actual not in (
        "pendiente",
        "reprogramada",
    ):
        return (
            "La cita ya no está pendiente de confirmación",
            400
        )

    ahora = timezone.now()

    limite_recuperado = False

    if cita.fecha_limite_confirmacion is None:

        # Solamente podemos reconstruir con seguridad
        # el límite de una solicitud pendiente original.
        if estado_actual != "pendiente":
            return (
                "No se puede determinar el plazo de "
                "confirmación de esta cita reprogramada",
                400
            )

        cita.fecha_limite_confirmacion = min(
            cita.fecha_creacion + timedelta(hours=24),
            cita.fecha_programada
        )

        limite_recuperado = True

    if ahora < cita.fecha_limite_confirmacion:
        return (
            "El plazo de confirmación todavía no ha vencido",
            400
        )

    estado_vencida = (
        Estado.objects
        .filter(nombre__iexact="vencida")
        .first()
    )

    if not estado_vencida:
        return (
            "Estado 'vencida' no configurado",
            500
        )

    # La cita venció porque el médico no la confirmó
    cita.id_estado = estado_vencida
    cita.fecha_vencimiento = ahora

    campos_actualizar = [
        "id_estado",
        "fecha_vencimiento",
    ]

    if limite_recuperado:
        campos_actualizar.append(
            "fecha_limite_confirmacion"
        )

    cita.save(
        update_fields=campos_actualizar
    )

    fecha_fmt = (
        timezone.localtime(
            cita.fecha_programada
        )
        .strftime(
            "%d/%m/%Y a las %H:%M"
        )
    )

    cita_data = CitaSerializer(
        cita
    ).data

    # Notificación al paciente
    enviarNotificacion(
        titulo="Solicitud de cita vencida",
        mensaje=(
            f"Tu solicitud de cita con el Dr. "
            f"{cita.id_medico.nombre} "
            f"{cita.id_medico.apellido} "
            f"para el {fecha_fmt} venció porque "
            f"no fue confirmada por el médico "
            f"dentro del plazo establecido. "
            f"Puedes solicitar una nueva cita."
        ),
        tipo="cita_vencida",
        id_usuario=cita.id_usuario_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data,
        }
    )

    # Notificación al médico
    enviarNotificacion(
        titulo="Solicitud de cita vencida",
        mensaje=(
            f"La solicitud de cita con el paciente "
            f"{cita.id_usuario.nombre} "
            f"{cita.id_usuario.apellido} "
            f"para el {fecha_fmt} venció porque "
            f"no fue confirmada dentro de las "
            f"24 horas permitidas."
        ),
        tipo="cita_vencida",
        id_medico=cita.id_medico_id,
        extra_data={
            "tipo_evento": "ACTUALIZACION_CITA",
            "cita": cita_data,
        }
    )
    
    transaction.on_commit(
        lambda cita_id=cita.id: enviarCorreosCitaVencida(
            cita_id
        ),
        robust=True,
    )

    return cita_data, 200


# Compatibilidad con código/tareas que todavía importen el nombre anterior.
def cancelarCitaVencidaService(id):
    return vencerCitaPorFaltaConfirmacionService(id)

def cancelarCitasPendientesVencidasService():

    citas = obtenerCitasPendientesVencidasService()

    vencidas = 0
    omitidas = 0

    for cita_id in citas.values_list(
        "id",
        flat=True
    ).iterator():

        _, status_code = (
            vencerCitaPorFaltaConfirmacionService(
                cita_id
            )
        )

        if status_code == 200:
            vencidas += 1
        else:
            omitidas += 1

    return {
        "vencidas": vencidas,
        "omitidas": omitidas,
    }
