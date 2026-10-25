export function positiveAppointmentId(value) {
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}
export function appointmentLinkError(status) {
    if (status === 403 || status === 401) return "No tienes permiso para consultar esta cita con la cuenta actual.";
    if (status === 404) return "Esta cita ya no está disponible. Puedes consultar las demás citas de tu agenda.";
    return "No pudimos abrir la cita. Revisa tu conexión y vuelve a intentarlo.";
}
export function matchesAppointmentTarget(appointment, id, historyId = null) {
    return Number(appointment?.id) === id && (historyId === null || Number(appointment?.historial_id) === historyId);
}
