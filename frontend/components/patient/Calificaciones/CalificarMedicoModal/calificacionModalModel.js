const COPY_BY_MODE = {
    create: {
        title: "Califica tu atención",
        description: "Cuéntanos cómo fue tu experiencia con el profesional.",
        submitLabel: "Enviar calificación",
        editable: true,
    },
    edit: {
        title: "Califica tu atención",
        description: "Puedes ajustar tu valoración durante el período permitido.",
        submitLabel: "Guardar cambios",
        editable: true,
    },
    read: {
        title: "Tu calificación",
        description: "Esta es la valoración que registraste para la atención recibida.",
        submitLabel: null,
        editable: false,
    },
};

export function getCalificacionModalCopy(mode) {
    return COPY_BY_MODE[mode] || COPY_BY_MODE.read;
}

export function getReadOnlyComment(value) {
    const comment = typeof value === "string" ? value.trim() : "";
    return comment || "No agregaste un comentario.";
}
