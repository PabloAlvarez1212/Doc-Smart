from datetime import datetime, timedelta

from django.utils import timezone

from citas.models import Cita
from medicos.models import (
    Medico,
    DisponibilidadMedico,
    ExcepcionDisponibilidadMedico,
)


ANTICIPACION_MINIMA_HORAS = 1
DIAS_MAXIMOS_AGENDA = 90


def obtenerHorarioEfectivoMedico(medico, fecha):
    """
    Obtiene los bloques de trabajo efectivos de un médico
    para una fecha determinada.

    Prioridad:
    1. NO_DISPONIBLE -> ningún bloque.
    2. HORARIO_ESPECIAL -> reemplaza horario semanal.
    3. Horario semanal normal.
    """

    excepciones = (
        ExcepcionDisponibilidadMedico.objects
        .filter(
            medico=medico,
            fecha=fecha
        )
        .order_by("hora_inicio")
    )

    if excepciones.filter(
        tipo=(
            ExcepcionDisponibilidadMedico
            .TipoExcepcion.NO_DISPONIBLE
        )
    ).exists():
        return []

    horarios_especiales = excepciones.filter(
        tipo=(
            ExcepcionDisponibilidadMedico
            .TipoExcepcion.HORARIO_ESPECIAL
        )
    )

    if horarios_especiales.exists():
        return [
            (
                excepcion.hora_inicio,
                excepcion.hora_fin
            )
            for excepcion in horarios_especiales
        ]

    dia_semana = fecha.weekday()

    disponibilidad_semanal = (
        DisponibilidadMedico.objects
        .filter(
            medico=medico,
            dia_semana=dia_semana,
            activo=True
        )
        .order_by("hora_inicio")
    )

    return [
        (
            bloque.hora_inicio,
            bloque.hora_fin
        )
        for bloque in disponibilidad_semanal
    ]

def intervalosSeSolapan(
    inicio_a,
    fin_a,
    inicio_b,
    fin_b
):
    return (
        inicio_a < fin_b
        and
        fin_a > inicio_b
    )

def obtenerCitasBloqueantes(
    medico,
    inicio_dia,
    fin_dia
):
    """
    Obtiene las citas potencialmente bloqueantes del día.

    La comprobación exacta del intervalo se realiza
    posteriormente para soportar citas antiguas que
    todavía tengan fecha_final=None.
    """

    return (
        Cita.objects
        .filter(
            id_medico=medico,
            fecha_programada__lt=fin_dia,
            fecha_programada__gte=inicio_dia,
        )
        .exclude(
            id_estado__nombre__iexact="cancelada"
        )
        .select_related("id_estado")
        .order_by("fecha_programada")
    )


def generarSlotsDisponibles(
    medico,
    fecha
):
    """
    Genera los slots realmente disponibles de un médico
    para una fecha determinada.
    """

    bloques = obtenerHorarioEfectivoMedico(
        medico,
        fecha
    )

    if not bloques:
        return []

    duracion = timedelta(
        minutes=medico.duracion_consulta
    )

    timezone_actual = timezone.get_current_timezone()

    inicio_dia = timezone.make_aware(
        datetime.combine(
            fecha,
            datetime.min.time()
        ),
        timezone_actual
    )

    fin_dia = inicio_dia + timedelta(days=1)

    citas = obtenerCitasBloqueantes(
        medico,
        inicio_dia,
        fin_dia
    )

    ahora = timezone.now()

    limite_anticipacion = (
        ahora
        + timedelta(
            hours=ANTICIPACION_MINIMA_HORAS
        )
    )

    slots = []

    for hora_inicio, hora_fin in bloques:

        inicio_bloque = timezone.make_aware(
            datetime.combine(
                fecha,
                hora_inicio
            ),
            timezone_actual
        )

        fin_bloque = timezone.make_aware(
            datetime.combine(
                fecha,
                hora_fin
            ),
            timezone_actual
        )

        inicio_slot = inicio_bloque

        while inicio_slot + duracion <= fin_bloque:

            fin_slot = inicio_slot + duracion

            # No mostrar horarios que incumplan
            # la anticipación mínima.
            if inicio_slot < limite_anticipacion:
                inicio_slot += duracion
                continue

            ocupado = False

            for cita in citas:

                inicio_cita = cita.fecha_programada

                # Compatibilidad temporal con citas
                # creadas antes de fecha_final.
                fin_cita = cita.fecha_final

                if fin_cita is None:
                    fin_cita = (
                        inicio_cita
                        + timedelta(
                            minutes=medico.duracion_consulta
                        )
                    )

                if intervalosSeSolapan(
                    inicio_slot,
                    fin_slot,
                    inicio_cita,
                    fin_cita
                ):
                    ocupado = True
                    break

            if not ocupado:

                slots.append({
                    "hora_inicio": (
                        inicio_slot
                        .strftime("%H:%M")
                    ),
                    "hora_fin": (
                        fin_slot
                        .strftime("%H:%M")
                    ),
                })

            inicio_slot += duracion

    return slots


def esHorarioDisponible(
    medico,
    fecha_programada
):
    """
    Comprueba si fecha_programada corresponde exactamente
    a uno de los slots actualmente disponibles del médico.
    """

    fecha = timezone.localtime(
        fecha_programada
    ).date()

    slots = generarSlotsDisponibles(
        medico,
        fecha
    )

    hora_solicitada = timezone.localtime(
        fecha_programada
    ).strftime("%H:%M")

    return any(
        slot["hora_inicio"] == hora_solicitada
        for slot in slots
    )


def obtenerHorariosDisponiblesService(
    medico_id,
    fecha
):

    medico = (
        Medico.objects
        .select_related(
            "id_especialidad"
        )
        .filter(
            id=medico_id
        )
        .first()
    )

    if not medico:
        return "Médico no encontrado", 404

    if fecha < timezone.localdate():
        return (
            "No puedes consultar disponibilidad "
            "de una fecha pasada",
            400
        )

    slots = generarSlotsDisponibles(
        medico,
        fecha
    )

    return {
        "medico": {
            "id": medico.id,
            "nombre": medico.nombre,
            "apellido": medico.apellido,
            "especialidad": (
                medico.id_especialidad.nombre
            ),
        },
        "fecha": fecha.isoformat(),
        "duracion_consulta": (
            medico.duracion_consulta
        ),
        "disponible": len(slots) > 0,
        "horarios": slots,
    }, 200


def obtenerDiasDisponibles(
    medico,
    fecha_desde,
    fecha_hasta
):
    """
    Devuelve las fechas que tienen al menos un slot
    realmente disponible.
    """

    dias = []

    fecha_actual = fecha_desde

    while fecha_actual <= fecha_hasta:

        slots = generarSlotsDisponibles(
            medico,
            fecha_actual
        )

        if slots:
            dias.append({
                "fecha": fecha_actual.isoformat(),
                "cantidad_slots": len(slots),
            })

        fecha_actual += timedelta(days=1)

    return dias



def obtenerDiasDisponiblesService(
    medico_id,
    fecha_desde,
    fecha_hasta
):

    medico = (
        Medico.objects
        .filter(id=medico_id)
        .first()
    )

    if not medico:
        return "Médico no encontrado", 404

    hoy = timezone.localdate()

    if fecha_desde < hoy:
        fecha_desde = hoy

    if fecha_hasta < fecha_desde:
        return (
            "La fecha final debe ser posterior "
            "o igual a la fecha inicial",
            400
        )

    limite = hoy + timedelta(
        days=DIAS_MAXIMOS_AGENDA
    )

    if fecha_hasta > limite:
        return (
            f"Solo puedes consultar disponibilidad "
            f"hasta {DIAS_MAXIMOS_AGENDA} días "
            f"hacia adelante",
            400
        )

    dias = obtenerDiasDisponibles(
        medico,
        fecha_desde,
        fecha_hasta
    )

    return {
        "medico_id": medico.id,
        "desde": fecha_desde.isoformat(),
        "hasta": fecha_hasta.isoformat(),
        "dias_disponibles": dias,
    }, 200



def obtenerProximaDisponibilidad(
    medico,
    dias_busqueda=DIAS_MAXIMOS_AGENDA
):
    """
    Obtiene el primer slot disponible del médico
    dentro del rango permitido.
    """

    hoy = timezone.localdate()

    fecha_limite = (
        hoy
        + timedelta(days=dias_busqueda)
    )

    fechas_candidatas = set()

    # Fechas provenientes del horario semanal.
    disponibilidades = (
        DisponibilidadMedico.objects
        .filter(
            medico=medico,
            activo=True
        )
        .values_list(
            "dia_semana",
            flat=True
        )
        .distinct()
    )

    dias_semana = set(disponibilidades)

    fecha_actual = hoy

    while fecha_actual <= fecha_limite:

        if fecha_actual.weekday() in dias_semana:
            fechas_candidatas.add(
                fecha_actual
            )

        fecha_actual += timedelta(days=1)

    # También pueden existir horarios especiales
    # en días sin disponibilidad semanal.
    fechas_especiales = (
        ExcepcionDisponibilidadMedico.objects
        .filter(
            medico=medico,
            tipo=(
                ExcepcionDisponibilidadMedico
                .TipoExcepcion.HORARIO_ESPECIAL
            ),
            fecha__gte=hoy,
            fecha__lte=fecha_limite,
        )
        .values_list(
            "fecha",
            flat=True
        )
        .distinct()
    )

    fechas_candidatas.update(
        fechas_especiales
    )

    for fecha in sorted(fechas_candidatas):

        slots = generarSlotsDisponibles(
            medico,
            fecha
        )

        if slots:

            primer_slot = slots[0]

            return {
                "fecha": fecha.isoformat(),
                "hora_inicio": (
                    primer_slot["hora_inicio"]
                ),
                "hora_fin": (
                    primer_slot["hora_fin"]
                ),
            }

    return None