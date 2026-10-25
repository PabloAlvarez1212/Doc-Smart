export function getAppointmentCode(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    return value;
}

export function getAppointmentReason(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    return value;
}

export function getAppointmentStatusMoment(appointment) {
    const state = String(appointment?.estado || '').trim().toLowerCase();
    const moments = {
        completada: ['Completada el', appointment?.fecha_completada || appointment?.fecha_final],
        cancelada: ['Cancelada el', appointment?.fecha_cancelacion],
        vencida: ['Vencida el', appointment?.fecha_vencimiento],
        reprogramada: ['Reprogramada para', appointment?.fecha_programada],
        inasistencia_paciente: ['Inasistencia registrada el', appointment?.fecha_inasistencia],
    };
    const moment = moments[state];
    if (!moment?.[1] || Number.isNaN(new Date(moment[1]).getTime())) return null;
    return {label:moment[0], at:moment[1]};
}

export async function copyAppointmentCode(value, clipboard) {
    const code = getAppointmentCode(value);
    const target = clipboard ?? globalThis.navigator?.clipboard;

    if (!code || typeof target?.writeText !== "function") return false;

    try {
        await target.writeText(code);
        return true;
    } catch {
        return false;
    }
}
