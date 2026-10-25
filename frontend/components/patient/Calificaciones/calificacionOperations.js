import { obtenerPrimerError } from "../../../src/app/utils/errrorUtils.js";

export function createCalificacionSubmitter({ crearService, actualizarService }) {
    let busy = false;

    const run = async (request) => {
        if (busy) return { ignored: true };

        busy = true;
        try {
            return await request();
        } finally {
            busy = false;
        }
    };

    return {
        crear({ idCita, puntuacion, comentario, esPublica = false }) {
            return run(() => crearService({
                id_cita: idCita,
                puntuacion,
                comentario,
                es_publica: esPublica,
            }));
        },
        actualizar({ idCalificacion, puntuacion, comentario }) {
            return run(() => actualizarService(idCalificacion, {
                puntuacion,
                comentario,
            }));
        },
    };
}

export function createCalificacionVisibilitySubmitter({ actualizarVisibilidadService }) {
    let busy = false;

    return {
        async actualizar({ idCalificacion, esPublica }) {
            if (busy) return { ignored: true };
            busy = true;
            try {
                return await actualizarVisibilidadService(idCalificacion, esPublica);
            } finally {
                busy = false;
            }
        },
    };
}

export function getCalificacionError(error) {
    return obtenerPrimerError(error?.response?.data?.errores)
        || "No fue posible guardar la calificación. Inténtalo nuevamente.";
}

export function getVisibilidadCalificacionError(error) {
    return obtenerPrimerError(error?.response?.data?.errores)
        || "No fue posible actualizar la visibilidad. Inténtalo nuevamente.";
}
