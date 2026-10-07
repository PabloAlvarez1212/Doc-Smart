export function hasActiveAppointmentFilters(status, filters = {}) {
    if (status && status !== "todas") return true;
    return Object.values(filters).some((value) => String(value ?? "").trim() !== "");
}

export function getAppointmentsResultKey(appointments = [], totalRecords = 0) {
    const ids = Array.isArray(appointments)
        ? appointments.map((appointment) => appointment?.id).filter((id) => id != null)
        : [];
    return `${Math.max(0, Number(totalRecords) || 0)}-${ids.length ? ids.join("-") : "empty"}`;
}

export function getAppointmentsResultMotion(reducedMotion) {
    if (reducedMotion) {
        return {
            initial: false,
            animate: { opacity: 1, transform: "translateY(0px)" },
            transition: { duration: 0 },
        };
    }

    return {
        initial: { opacity: 1, transform: "translateY(3px)" },
        animate: { opacity: 1, transform: "translateY(0px)" },
        transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
    };
}

const PATIENT_ACTIONS_BY_STATUS = {
    pendiente: ["reprogramar", "cancelar"],
    confirmada: ["reprogramar", "cancelar"],
    reprogramada: ["reprogramar", "cancelar"],
};

export function getPatientAppointmentActionKeys(status) {
    return PATIENT_ACTIONS_BY_STATUS[String(status || "").toLowerCase()] || [];
}

export function getBogotaDateInputValue(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}

export function buildBogotaAppointmentDateTime(fecha, hora) {
    if (!fecha || !hora) return "";
    return `${fecha}T${hora}:00-05:00`;
}

export function canSubmitReprogram({
    fecha,
    hora,
    horarios = [],
    cargando = false,
    guardando = false,
}) {
    if (!fecha || !hora || cargando || guardando || !Array.isArray(horarios)) return false;
    return horarios.some((slot) => slot?.hora_inicio === hora);
}
