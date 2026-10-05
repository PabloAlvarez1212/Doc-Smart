const ACTIONS_BY_STATUS = {
    pendiente: ["reprogramar", "cancelar", "confirmar"],
    reprogramada: ["reprogramar", "cancelar", "confirmar"],
    confirmada: ["reprogramar", "cancelar", "completar"],
};

export function getDoctorAppointmentActionKeys(status) {
    return ACTIONS_BY_STATUS[String(status || "").toLowerCase()] || [];
}
