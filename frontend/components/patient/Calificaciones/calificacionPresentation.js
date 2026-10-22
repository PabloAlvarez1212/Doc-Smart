const INVALID_DATE_LABEL = "Fecha no disponible";

export function getCalificacionPresentation(cita) {
    const estado = String(cita?.estado || "").trim().toLowerCase();

    if (estado !== "completada") return null;

    const calificacion = cita?.calificacion;

    if (!calificacion) {
        return { mode: "create", label: "Calificar atención" };
    }

    if (calificacion.puede_editar === true && Number(calificacion.id) > 0) {
        return { mode: "edit", label: "Ver / editar calificación" };
    }

    return { mode: "read", label: "Ver calificación" };
}

export function buildCalificacionAction(cita, onCalificar, icon) {
    const presentation = getCalificacionPresentation(cita);
    if (!presentation) return null;

    return {
        id: "calificacion",
        label: presentation.label,
        icon,
        tone: "rating",
        onClick: () => onCalificar?.(cita),
    };
}

export function getInitialCalificacionValues(cita) {
    const puntuacion = Number(cita?.calificacion?.puntuacion);
    const comentario = cita?.calificacion?.comentario;

    return {
        puntuacion: Number.isInteger(puntuacion) && puntuacion >= 1 && puntuacion <= 5
            ? puntuacion
            : 0,
        comentario: typeof comentario === "string" ? comentario : "",
        esPublica: cita?.calificacion?.es_publica === true,
    };
}

export function validateCalificacion({ puntuacion, comentario = "" }) {
    const errors = {};

    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
        errors.puntuacion = "Selecciona una puntuación de 1 a 5 estrellas.";
    }

    if (String(comentario).length > 1000) {
        errors.comentario = "El comentario no puede superar los 1000 caracteres.";
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}

export function formatCalificacionDate(value) {
    if (!value) return INVALID_DATE_LABEL;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return INVALID_DATE_LABEL;

    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Bogota",
    }).format(date);
}
