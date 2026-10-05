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
