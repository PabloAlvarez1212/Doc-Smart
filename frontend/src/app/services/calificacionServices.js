import api from "./api";

// CREAR CALIFICACIÓN

export const crearCalificacionService = async function (data) {

    const response = await api.post(
        "/calificaciones/crear/",
        data
    );

    return response.data;
};

// ACTUALIZAR CALIFICACIÓN

export const actualizarCalificacionService = async function (
    id_calificacion,
    data
) {

    const response = await api.patch(
        `/calificaciones/actualizar/${id_calificacion}/`,
        data
    );

    return response.data;
};

// LISTAR CALIFICACIONES DE UN MÉDICO

export const listarCalificacionesMedicoService = async function (
    id_medico
) {

    const response = await api.get(
        `/calificaciones/medico/${id_medico}/`
    );

    return response.data;
};

// OBTENER PROMEDIO DE CALIFICACIONES

export const obtenerPromedioCalificacionesMedicoService = async function (
    id_medico
) {

    const response = await api.get(
        `/calificaciones/medico/${id_medico}/promedio/`
    );

    return response.data;
};

// ACTUALIZAR VISIBILIDAD DE CALIFICACIÓN

export const actualizarVisibilidadCalificacionService = async function (
    id_calificacion,
    es_publica
) {
    const response = await api.patch(
        `/calificaciones/visibilidad/${id_calificacion}/`,
        {
            es_publica
        }
    );

    return response.data;
};

// LISTAR MIS CALIFICACIONES COMO MÉDICO

export const listarMisCalificacionesMedicoService = async function () {
    const response = await api.get(
        "/calificaciones/medico/mis-calificaciones/"
    );

    return response.data;
};