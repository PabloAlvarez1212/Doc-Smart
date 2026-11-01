function safeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatDecimal(value) {
    return Number(value).toLocaleString("es-CO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

export function buildCancellationRateMetric(rate) {
    if (!rate) return { value: null, supportingText: undefined };

    const base = safeCount(rate.base);
    const hasRate = base > 0 && rate.tasa !== null && rate.tasa !== undefined;

    return {
        value: hasRate ? `${formatDecimal(rate.tasa)}%` : "Sin citas",
        supportingText: `${safeCount(rate.canceladas)} de ${base} ${base === 1 ? "cita programada" : "citas programadas"} este mes`,
    };
}

export function buildRatingMetric(rating) {
    if (!rating) return { value: null, supportingText: undefined };

    const total = safeCount(rating.total);
    const hasRating = total > 0 && rating.promedio !== null && rating.promedio !== undefined;

    return {
        value: hasRating ? `${formatDecimal(rating.promedio)} / 5` : "Sin calificaciones",
        supportingText: `${total} ${total === 1 ? "calificación" : "calificaciones"} este mes`,
    };
}
