import api from "./api"
const API_URL = 'http://localhost:8000/api/'
export const obtenerDashboardPacienteInicioService = async function () {
    const response = await api.get(`${API_URL}dashboard/inicio/paciente/`)
    return response.data
}
export const obtenerPerfilPacienteService = async function () {
    const response = await api.get(`${API_URL}perfil/`)
    return response.data
}
export const actualizarPerfilPacienteService = async function (formData) {
    const response = await api.put(`${API_URL}perfil/`,formData)
    return response.data
}
export const actualizarFotoPerfilPacienteService = async (archivo) => {
    const formData = new FormData();
    formData.append("foto_perfil", archivo);
    const response = await api.patch("/perfil/foto/",formData);
    return response.data;
};