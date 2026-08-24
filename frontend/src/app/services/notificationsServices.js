import api from "./api";

export const obtenerNotificacionesService = async () => {
    const response = await api.get(
        "/notificaciones/"
    );

    return response.data;
};


export const marcarNotificacionLeidaService = async function (
    id_notificacion
) {
    const response = await api.patch(
        `/notificaciones/${id_notificacion}/leida/`
    );

    return response.data;
};


export const marcarTodasNotificacionesLeidasService = async function () {
    const response = await api.patch(
        "/notificaciones/leida/todas/"
    );

    return response.data;
};


export const eliminarNotificacionService = async function (
    id_notificacion
) {
    const response = await api.delete(
        `/notificaciones/${id_notificacion}/eliminar/`
    );

    return response.data;
};


export const eliminarTodasNotificacionesService = async () => {
    const response = await api.delete(
        "/notificaciones/eliminar/todas/"
    );

    return response.data;
};