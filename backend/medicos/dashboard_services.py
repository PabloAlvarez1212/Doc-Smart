from datetime import date, datetime, time, timedelta
from citas.models import Cita
from medicos.models import Medico
from datetime import timedelta
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, ExtractIsoWeekDay, ExtractHour
from calificaciones.models import Calificacion
from django.utils import timezone

#! GRÁFICA 1: CITAS PROGRAMADAS VS COMPLETADAS

def obtenerEvolucionCitasService(citas, inicio, fin):

    # Obtener la zona horaria de Django
    zona_horaria = timezone.get_current_timezone()

    # Convertir el rango a fechas locales
    fecha_inicio = timezone.localtime(inicio, zona_horaria).date()
    fecha_fin = (timezone.localtime(fin, zona_horaria).date() - timedelta(days=1))

    # Calcular la cantidad de días
    cantidad_dias = (fecha_fin - fecha_inicio).days + 1

    # Determinar la agrupación
    if cantidad_dias <= 31:
        agrupacion = "dia"
        funcion_fecha = TruncDay

    elif cantidad_dias <= 90:
        agrupacion = "semana"
        funcion_fecha = TruncWeek

    else:
        agrupacion = "mes"
        funcion_fecha = TruncMonth

    # Consultar citas programadas
    citasProgramadas = citas.filter(
        fecha_programada__gte=inicio,
        fecha_programada__lt=fin
    )

    # Consultar citas completadas
    citasCompletadas = citas.filter(
        id_estado__nombre__iexact="completada",
        fecha_completada__isnull=False,
        fecha_completada__gte=inicio,
        fecha_completada__lt=fin
    )

    # Consultar citas canceladas
    citasCanceladas = citas.filter(
        id_estado__nombre__iexact="cancelada",
        fecha_cancelacion__isnull=False,
        fecha_cancelacion__gte=inicio,
        fecha_cancelacion__lt=fin
    )
    
    # Agrupar citas programadas por período
    cantidadCitasProgramadas = (
        citasProgramadas
        .annotate(
            periodo=funcion_fecha(
                "fecha_programada",
                tzinfo=zona_horaria
            )
        )
        .values("periodo")
        .annotate(total=Count("id"))
        .order_by("periodo")
    )

    # Agrupar citas completadas por período
    cantidadCitasCompletadas = (
        citasCompletadas
        .annotate(
            periodo=funcion_fecha(
                "fecha_final",
                tzinfo=zona_horaria
            )
        )
        .values("periodo")
        .annotate(total=Count("id"))
        .order_by("periodo")
    )

    # Agrupar citas canceladas por período
    canceladasPorPeriodo = (
        citasCanceladas
        .annotate(
            periodo=funcion_fecha(
                "fecha_cancelacion",
                tzinfo=zona_horaria
            )
        )
        .values("periodo")
        .annotate(total=Count("id"))
        .order_by("periodo")
    )

    canceladas = {
        registro["periodo"].date(): registro["total"]
        for registro in canceladasPorPeriodo
    }
    
    # Convertir los resultados en diccionarios
    programadas = {
        registro["periodo"].date(): registro["total"]
        for registro in cantidadCitasProgramadas
    }

    completadas = {
        registro["periodo"].date(): registro["total"]
        for registro in cantidadCitasCompletadas
    }

    # Preparar los datos de la gráfica
    grafica = []

    # Determinar el primer período
    if agrupacion == "dia":
        periodo_actual = fecha_inicio

    elif agrupacion == "semana":
        periodo_actual = fecha_inicio - timedelta(
            days=fecha_inicio.weekday()
        )

    else:
        periodo_actual = fecha_inicio.replace(day=1)

    # Completar todos los períodos, incluyendo los vacíos
    while periodo_actual <= fecha_fin:

        if agrupacion == "mes":
            periodo = periodo_actual.strftime("%Y-%m")
        else:
            periodo = periodo_actual.isoformat()

        grafica.append({
            "periodo": periodo,
            "programadas": programadas.get(periodo_actual, 0),
            "completadas": completadas.get(periodo_actual, 0),
            "canceladas": canceladas.get(periodo_actual, 0),
        })

        # Avanzar al siguiente período
        if agrupacion == "dia":
            periodo_actual += timedelta(days=1)

        elif agrupacion == "semana":
            periodo_actual += timedelta(weeks=1)

        else:
            if periodo_actual.month == 12:
                periodo_actual = periodo_actual.replace(
                    year=periodo_actual.year + 1,
                    month=1
                )
            else:
                periodo_actual = periodo_actual.replace(
                    month=periodo_actual.month + 1
                )

    return grafica

#! GRÁFICA 2: DISTRIBUCIÓN POR ESTADO

def obtenerDistribucionEstadosService(citas, inicio, fin):

    # Filtrar las citas por fecha programada
    citasPorEstado = citas.filter(
        fecha_programada__gte=inicio,
        fecha_programada__lt=fin
    )

    # Agrupar las citas por estado
    distribucionEstados = (
        citasPorEstado
        .values("id_estado__nombre")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    # Obtener la cantidad total de citas
    totalCitas = citasPorEstado.count()

    # Preparar los datos de la gráfica
    graficaEstados = []

    for registro in distribucionEstados:

        cantidad = registro["total"]

        # Calcular el porcentaje de cada estado
        porcentaje = (
            round((cantidad / totalCitas) * 100, 2)
            if totalCitas > 0 else 0
        )

        graficaEstados.append({
            "estado": registro["id_estado__nombre"],
            "cantidad": cantidad,
            "porcentaje": porcentaje
        })

    return graficaEstados

#! GRÁFICA 3: ASISTENCIA E INASISTENCIA

def obtenerAsistenciaPacientesService(citas, inicio, fin):

    # Filtrar las citas por fecha programada
    citasPeriodo = citas.filter(
        fecha_programada__gte=inicio,
        fecha_programada__lt=fin
    )

    # Consultar asistencias e inasistencias
    estadisticas = citasPeriodo.aggregate(
        asistencias=Count(
            "id",
            filter=Q(id_estado__nombre__iexact="completada")
        ),
        inasistencias=Count(
            "id",
            filter=Q(id_estado__nombre__iexact="inasistencia_paciente")
        )
    )

    # Obtener cantidades
    cantidadAsistencias = estadisticas["asistencias"]
    cantidadInasistencias = estadisticas["inasistencias"]

    # Calcular el total de citas con resultado conocido
    totalAsistencia = cantidadAsistencias + cantidadInasistencias

    # Calcular porcentaje de asistencia
    porcentajeAsistencia = (
        round((cantidadAsistencias / totalAsistencia) * 100, 2)
        if totalAsistencia > 0 else 0
    )

    # Calcular porcentaje de inasistencia
    porcentajeInasistencia = (
        round((cantidadInasistencias / totalAsistencia) * 100, 2)
        if totalAsistencia > 0 else 0
    )

    # Preparar los datos para la gráfica
    graficaAsistencia = [
        {
            "estado": "Asistencias",
            "cantidad": cantidadAsistencias,
            "porcentaje": porcentajeAsistencia
        },
        {
            "estado": "Inasistencias",
            "cantidad": cantidadInasistencias,
            "porcentaje": porcentajeInasistencia
        }
    ]

    return graficaAsistencia

#! GRÁFICA 4: DÍAS CON MAYOR DEMANDA

def obtenerDiasMayorDemandaService(citas, inicio, fin, zona_horaria):

    # Filtrar las citas por fecha programada
    citasPeriodo = citas.filter(
        fecha_programada__gte=inicio,
        fecha_programada__lt=fin
    )

    # Agrupar las citas por día de la semana
    citasPorDia = (
        citasPeriodo
        .annotate(
            dia=ExtractIsoWeekDay(
                "fecha_programada",
                tzinfo=zona_horaria
            )
        )
        .values("dia")
        .annotate(total=Count("id"))
        .order_by("dia")
    )

    # Definir los días de la semana
    diasSemana = {
        1: "Lunes",
        2: "Martes",
        3: "Miércoles",
        4: "Jueves",
        5: "Viernes",
        6: "Sábado",
        7: "Domingo"
    }

    # Convertir los resultados en un diccionario
    cantidadCitasPorDia = {
        registro["dia"]: registro["total"]
        for registro in citasPorDia
    }

    # Preparar la información de la gráfica
    graficaDemanda = []

    for numeroDia, nombreDia in diasSemana.items():

        graficaDemanda.append({
            "dia": nombreDia,
            "cantidad": cantidadCitasPorDia.get(numeroDia, 0)
        })

    return graficaDemanda

#! DEMANDA POR HORARIO (día de la semana × hora)

NOMBRES_DIAS = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
}

def obtenerDemandaHorariaService(citas, inicio, fin, zona_horaria):

    registros = (
        citas.filter(
            fecha_programada__gte=inicio,
            fecha_programada__lt=fin
        )
        .annotate(
            dia=ExtractIsoWeekDay("fecha_programada", tzinfo=zona_horaria),
            hora=ExtractHour("fecha_programada", tzinfo=zona_horaria),
        )
        .values("dia", "hora")
        .annotate(total=Count("id"))
        .order_by("dia", "hora")
    )

    return [
        {
            "dia_numero": registro["dia"],
            "dia": NOMBRES_DIAS[registro["dia"]],
            "hora": registro["hora"],
            "cantidad": registro["total"],
        }
        for registro in registros
    ]

#! GRÁFICA 5: EVOLUCIÓN DE CALIFICACIONES

def obtenerEvolucionCalificacionesService(medico, inicio, fin):

    zona_horaria = timezone.get_current_timezone()

    fecha_inicio = timezone.localtime(inicio, zona_horaria).date()
    fecha_fin = timezone.localtime(fin, zona_horaria).date() - timedelta(days=1)

    cantidad_dias = (fecha_fin - fecha_inicio).days + 1

    # Misma agrupación que la evolución de citas
    if cantidad_dias <= 31:
        agrupacion = "dia"
        funcion_fecha = TruncDay
    elif cantidad_dias <= 90:
        agrupacion = "semana"
        funcion_fecha = TruncWeek
    else:
        agrupacion = "mes"
        funcion_fecha = TruncMonth

    # Se cuentan las calificaciones por la fecha en que el paciente las registró
    registros = (
        Calificacion.objects.filter(
            id_cita__id_medico=medico,
            fecha_creacion__gte=inicio,
            fecha_creacion__lt=fin
        )
        .annotate(periodo=funcion_fecha("fecha_creacion", tzinfo=zona_horaria))
        .values("periodo")
        .annotate(total=Count("id"), promedio=Avg("puntuacion"))
        .order_by("periodo")
    )

    por_periodo = {
        registro["periodo"].date(): (registro["total"], registro["promedio"])
        for registro in registros
    }

    if agrupacion == "dia":
        periodo_actual = fecha_inicio
    elif agrupacion == "semana":
        periodo_actual = fecha_inicio - timedelta(days=fecha_inicio.weekday())
    else:
        periodo_actual = fecha_inicio.replace(day=1)

    grafica = []

    while periodo_actual <= fecha_fin:

        total, promedio = por_periodo.get(periodo_actual, (0, None))

        grafica.append({
            "periodo": (
                periodo_actual.strftime("%Y-%m")
                if agrupacion == "mes"
                else periodo_actual.isoformat()
            ),
            "cantidad": total,
            "promedio": round(float(promedio), 2) if promedio is not None else None,
        })

        if agrupacion == "dia":
            periodo_actual += timedelta(days=1)
        elif agrupacion == "semana":
            periodo_actual += timedelta(weeks=1)
        elif periodo_actual.month == 12:
            periodo_actual = periodo_actual.replace(year=periodo_actual.year + 1, month=1)
        else:
            periodo_actual = periodo_actual.replace(month=periodo_actual.month + 1)

    return grafica

#! TOTALES DE UN PERÍODO (también se usan para comparar con el anterior)

def calcularTotalesPeriodoService(citas, medico, inicio, fin):

    totalProgramadas = citas.filter(
        fecha_programada__gte=inicio,
        fecha_programada__lt=fin
    ).count()

    totalCompletadas = citas.filter(
        id_estado__nombre__iexact="completada",
        fecha_completada__isnull=False,
        fecha_completada__gte=inicio,
        fecha_completada__lt=fin
    ).count()

    totalCanceladas = citas.filter(
        id_estado__nombre__iexact="cancelada",
        fecha_cancelacion__isnull=False,
        fecha_cancelacion__gte=inicio,
        fecha_cancelacion__lt=fin
    ).count()

    asistencia = {
        registro["estado"]: registro
        for registro in obtenerAsistenciaPacientesService(citas, inicio, fin)
    }

    calificaciones = Calificacion.objects.filter(
        id_cita__id_medico=medico,
        fecha_creacion__gte=inicio,
        fecha_creacion__lt=fin
    ).aggregate(
        promedio=Avg("puntuacion"),
        total=Count("id")
    )

    promedio = calificaciones["promedio"]

    return {
        "total_programadas": totalProgramadas,
        "total_completadas": totalCompletadas,
        "total_canceladas": totalCanceladas,
        "total_inasistencias": asistencia["Inasistencias"]["cantidad"],
        "porcentaje_asistencia": asistencia["Asistencias"]["porcentaje"],
        "promedio_calificacion": round(float(promedio), 2) if promedio is not None else None,
        "total_calificaciones": calificaciones["total"],
    }

def obtenerEstadisticasMedicoService(
    fecha_inicio=None,
    fecha_fin=None,
    medico=None
):

    # 1. VALIDAR MÉDICO

    if not isinstance(medico, Medico):
        return "Debes ser un médico", 403

    # 2. VALIDAR Y PREPARAR FECHAS

    hoy = timezone.localdate()

    # Utilizar el año actual por defecto
    if fecha_inicio is None and fecha_fin is None:

        fecha_inicio = date(hoy.year, 1, 1)
        fecha_fin = date(hoy.year, 12, 31)

    elif fecha_inicio is None or fecha_fin is None:

        return "Debes proporcionar ambas fechas", 400


    # Convertir las fechas recibidas
    try:

        if isinstance(fecha_inicio, str):
            fecha_inicio = date.fromisoformat(fecha_inicio)

        if isinstance(fecha_fin, str):
            fecha_fin = date.fromisoformat(fecha_fin)

    except (ValueError, TypeError):

        return "Formato de fecha inválido. Utiliza YYYY-MM-DD", 400


    # Verificar que sean fechas válidas
    if (
        not isinstance(fecha_inicio, date)
        or isinstance(fecha_inicio, datetime)
        or not isinstance(fecha_fin, date)
        or isinstance(fecha_fin, datetime)
    ):
        return "Las fechas proporcionadas no son válidas", 400


    if fecha_inicio > fecha_fin:

        return "La fecha inicial no puede superar la fecha final", 400

    # 3. PREPARAR RANGO DE FECHAS

    zona_horaria = timezone.get_current_timezone()

    inicio = timezone.make_aware(
        datetime.combine(fecha_inicio, time.min),
        zona_horaria
    )

    # Límite exclusivo: día siguiente a fecha_fin
    try:
        fin_exclusivo = fecha_fin + timedelta(days=1)
    except OverflowError:
        return "La fecha final está fuera del rango permitido", 400

    fin = timezone.make_aware(
        datetime.combine(fin_exclusivo, time.min),
        zona_horaria
    )

    # 4. DETERMINAR AGRUPACIÓN

    cantidad_dias = (fecha_fin - fecha_inicio).days + 1

    if cantidad_dias <= 31:

        agrupacion = "dia"

    elif cantidad_dias <= 90:

        agrupacion = "semana"

    else:

        agrupacion = "mes"

    # 5. OBTENER CITAS DEL MÉDICO

    citas = Cita.objects.filter(
        id_medico=medico
    )

    #! 6. GRÁFICA 1: EVOLUCIÓN DE CITAS

    evolucion = obtenerEvolucionCitasService(
        citas,
        inicio,
        fin
    )

    #! 7. GRÁFICA 2: DISTRIBUCIÓN POR ESTADO

    estados = obtenerDistribucionEstadosService(
        citas,
        inicio,
        fin
    )

    #! 8. GRÁFICA 3: ASISTENCIA DE PACIENTES

    asistencia = obtenerAsistenciaPacientesService(
        citas,
        inicio,
        fin
    )

    #! 9. GRÁFICA 4: DÍAS CON MAYOR DEMANDA

    demanda = obtenerDiasMayorDemandaService(
        citas,
        inicio,
        fin,
        zona_horaria
    )

    #! EVOLUCIÓN DE CALIFICACIONES

    calificaciones = obtenerEvolucionCalificacionesService(
        medico,
        inicio,
        fin
    )

    #! DEMANDA POR HORARIO

    demandaHoraria = obtenerDemandaHorariaService(
        citas,
        inicio,
        fin,
        zona_horaria
    )

    #! COMPARACIÓN CON EL PERÍODO ANTERIOR (misma cantidad de días)

    totalesActuales = calcularTotalesPeriodoService(
        citas,
        medico,
        inicio,
        fin
    )

    totalesAnteriores = None

    try:
        anteriorFin = fecha_inicio - timedelta(days=1)
        anteriorInicio = anteriorFin - timedelta(days=cantidad_dias - 1)

        totalesAnteriores = calcularTotalesPeriodoService(
            citas,
            medico,
            timezone.make_aware(
                datetime.combine(anteriorInicio, time.min),
                zona_horaria
            ),
            timezone.make_aware(
                datetime.combine(anteriorFin + timedelta(days=1), time.min),
                zona_horaria
            )
        )
    except (OverflowError, ValueError):
        totalesAnteriores = None

    #! ESTADÍSTICAS GENERALES

    totalProgramadas = sum(
        registro["programadas"]
        for registro in evolucion
    )

    totalCompletadas = sum(
        registro["completadas"]
        for registro in evolucion
    )

    totalInasistencias = next(
        (
            registro["cantidad"]
            for registro in asistencia
            if registro["estado"] == "Inasistencias"
        ),
        0
    )
    
    totalCanceladas = sum(
        registro["canceladas"]
        for registro in evolucion
    )

    porcentajeAsistencia = next(
        (
            registro["porcentaje"]
            for registro in asistencia
            if registro["estado"] == "Asistencias"
        ),
        0
    )
    
    # 10. RETORNAR ESTADÍSTICAS

    return {

        "filtros": {
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "agrupacion": agrupacion
        },
        
        "estadisticas": {
            "total_programadas": totalProgramadas,
            "total_completadas": totalCompletadas,
            "total_canceladas": totalCanceladas,
            "total_inasistencias": totalInasistencias,
            "porcentaje_asistencia": porcentajeAsistencia,
            "promedio_calificacion": totalesActuales["promedio_calificacion"],
            "total_calificaciones": totalesActuales["total_calificaciones"]
        },

        "estadisticas_anteriores": totalesAnteriores,
        
        "grafica_citas": evolucion,

        "grafica_estados": estados,

        "grafica_asistencia": asistencia,

        "grafica_demanda": demanda,

        "grafica_demanda_horaria": demandaHoraria,

        "grafica_calificaciones": calificaciones

    }, 200