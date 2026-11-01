export function safeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function formatDecimal(value) {
    return Number(value).toLocaleString("es-CO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

const EMPTY = "—";

export function buildCancellationRatioMetric(rate) {
    if (!rate) return { value: EMPTY, canceled: 0, base: 0, context: undefined };

    const base = safeCount(rate.base);
    if (base === 0) {
        return { value: EMPTY, canceled: 0, base: 0, context: "Sin citas programadas este mes" };
    }

    const canceled = Math.min(safeCount(rate.canceladas), base);
    const percentage = rate.tasa ?? (canceled / base) * 100;

    return {
        value: `${canceled} de ${base}`,
        canceled,
        base,
        context: `${formatDecimal(percentage)} % de las programadas del mes`,
    };
}

export function buildRatingMetric(rating) {
    if (!rating) return { value: EMPTY, average: null, context: undefined };

    const total = safeCount(rating.total);
    const hasRating = total > 0 && rating.promedio !== null && rating.promedio !== undefined;

    if (!hasRating) {
        return { value: EMPTY, average: null, context: "Aún sin calificaciones este mes" };
    }

    return {
        value: `${formatDecimal(rating.promedio)} / 5`,
        average: Number(rating.promedio),
        context: `${total} ${total === 1 ? "calificación" : "calificaciones"}`,
    };
}
