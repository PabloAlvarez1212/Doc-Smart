import api from './api'
const API_URL = 'http://localhost:8000/api/'

export const obtenerNotificacionesService = async () => {
    const response = await api.get("/notificaciones/")
    return response.data
}

export const marcarNotificacionLeidaService = async function (id_notificacion) {
    const response = await api.patch(`${API_URL}notificaciones/${id_notificacion}/leida/`);
    return response.data;
};