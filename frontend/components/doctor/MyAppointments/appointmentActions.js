const ACTIONS_BY_STATUS = {
    pendiente: ["reprogramar", "cancelar", "confirmar"],
    reprogramada: ["reprogramar", "cancelar", "confirmar"],
    confirmada: ["reprogramar", "cancelar", "completar"],
};

export function getDoctorAppointmentActionKeys(status, cita, now = Date.now()) {
    if (String(status).toLowerCase() === 'completada' && cita) {
        const limit = Date.parse(cita.fecha_limite_cierre || '');
        return Number.isFinite(limit) && now < limit ? ['documentos'] : [];
    }
    return ACTIONS_BY_STATUS[String(status || "").toLowerCase()] || [];
}
