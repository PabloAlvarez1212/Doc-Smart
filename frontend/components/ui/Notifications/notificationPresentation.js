const PRESENTATION_BY_TYPE = {
    cita_confirmada: { icon: "calendar-check", tone: "appointment" },
    cita_completada: { icon: "calendar-check", tone: "appointment" },
    cita_agendada: { icon: "calendar-clock", tone: "appointment" },
    cita_pendiente: { icon: "calendar-clock", tone: "appointment" },
    nueva_solicitud: { icon: "calendar-clock", tone: "appointment" },
    cita_reprogramada: { icon: "calendar-clock", tone: "appointment" },
    cita_cancelada: { icon: "calendar-x", tone: "attention" },
    mensaje_nuevo: { icon: "message", tone: "message" },
    historial_creado: { icon: "file", tone: "document" },
};

export function getNotificationPresentation(type) {
    return PRESENTATION_BY_TYPE[String(type || "").toLowerCase()] || {
        icon: "bell",
        tone: "default",
    };
}

export function getNotificationReadState(read) {
    return read
        ? { key: "read", label: "Leída" }
        : { key: "unread", label: "Nueva" };
}
