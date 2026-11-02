import { formatDashboardMonthLong } from "../dashboardMonthFormatters";
import { buildCancellationRatioMetric, buildRatingMetric, safeCount } from "./summaryRateMetrics";
import { buildSpecialtyMetric } from "./summarySpecialtyMetrics";

const EMPTY = "—";

export const buildCancellationsRow = buildCancellationRatioMetric;
export const buildRating = buildRatingMetric;

export function formatCount(value) {
    return safeCount(value).toLocaleString("es-CO");
}

export function buildTodayAppointments(metrics) {
    if (!metrics) return { value: EMPTY, context: undefined };

    const count = safeCount(metrics.citas_hoy);

    return {
        value: formatCount(count),
        context: count === 0
            ? "Ninguna programada para hoy"
            : `${formatCount(count)} ${count === 1 ? "programada" : "programadas"} para hoy`,
    };
}

/** status: "ok" sin pendientes, "alert" con pendientes, "unknown" sin datos. */
export function buildPendingRequests(metrics) {
    if (!metrics) return { value: EMPTY, status: "unknown", context: undefined };

    const count = safeCount(metrics.total_solicitudes_pendientes);
    const days = metrics.antiguedad_solicitud_pendiente_dias;
    const hasAge = count > 0 && days !== null && days !== undefined;
    const oldest = safeCount(days);

    return {
        value: formatCount(count),
        status: count > 0 ? "alert" : "ok",
        context: hasAge ? `la más antigua: ${oldest} ${oldest === 1 ? "día" : "días"}` : undefined,
    };
}

/** status: "neutral" sin casos (se muestra 0), "alert" con casos por confirmar, "unknown" sin datos. */
export function buildPendingVerifications(metrics) {
    if (!metrics) return { value: EMPTY, status: "unknown" };

    const count = safeCount(metrics.verificaciones_por_confirmar);

    return { value: formatCount(count), status: count > 0 ? "alert" : "neutral" };
}

export function buildActivePatients(metrics) {
    if (!metrics) return { value: EMPTY, active: 0, total: 0 };

    const total = safeCount(metrics.total_pacientes);
    const active = Math.min(safeCount(metrics.pacientes_activos_mes), total);

    return { value: `${formatCount(active)} de ${formatCount(total)}`, active, total };
}

const EMPTY_SPECIALTY_CONTEXT = {
    creada: "Sin citas creadas este mes",
    programada: "Sin citas programadas este mes",
};

export function buildSpecialtyRow(metric, kind) {
    const specialty = buildSpecialtyMetric(metric, kind);

    return specialty
        ? { value: specialty.especialidad, context: specialty.textoTotal }
        : { value: EMPTY, context: EMPTY_SPECIALTY_CONTEXT[kind] };
}

/** Nombre del mes en español y en minúscula: "noviembre". */
export function monthName(date = new Date()) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return formatDashboardMonthLong(key).split(" ")[0].toLocaleLowerCase("es-CO");
}
