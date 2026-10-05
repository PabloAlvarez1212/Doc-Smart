function timestampFor(appointment) {
    const timestamp = Date.parse(appointment?.fecha_programada);
    return Number.isFinite(timestamp) ? timestamp : null;
}

export function sortUpcomingAppointments(appointments) {
    if (!Array.isArray(appointments)) return [];

    return appointments
        .filter((appointment) => timestampFor(appointment) !== null)
        .slice()
        .sort((first, second) => timestampFor(first) - timestampFor(second));
}

export function getNextAppointment(appointments) {
    return sortUpcomingAppointments(appointments)[0] ?? null;
}

export function updateUpcomingAppointmentsCount(currentCount, eventType) {
    const count = Math.max(0, Number(currentCount) || 0);

    if (eventType === "CITA_CONFIRMADA") return count + 1;
    if (
        eventType === "CITA_CANCELADA"
        || eventType === "CITA_COMPLETADA"
        || eventType === "CITA_REPROGRAMADA"
    ) {
        return Math.max(0, count - 1);
    }

    return count;
}
