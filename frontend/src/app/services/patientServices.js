import api from "./api"
const API_URL = 'http://localhost:8000/api/'
export const obtenerDashboardPacienteInicioService = async function () {
    const response = await api.get(`${API_URL}dashboard/inicio/paciente/`)
    return response.data
}