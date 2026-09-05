const TIME_ZONE = "America/Bogota";

const toDate = (value) => {
    if (!value) return null;

    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T12:00:00Z`
        : value;
    const date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatMedicalHistoryDate = (value, short = false) => {
    const date = toDate(value);
    if (!date) return "Fecha no disponible";

    return new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: short ? "short" : "long",
        year: "numeric",
        timeZone: TIME_ZONE,
    }).format(date);
};

export const formatMedicalHistoryTime = (value) => {
    const date = toDate(value);
    if (!date) return "Hora no disponible";

    return new Intl.DateTimeFormat("es-CO", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: TIME_ZONE,
    }).format(date);
};

export const getMedicalHistoryTimestamp = (value) => {
    const date = toDate(value);
    return date ? date.getTime() : 0;
};
