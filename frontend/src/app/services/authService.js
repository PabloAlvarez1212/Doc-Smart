import api from './api'
import axios from 'axios'

const API_URL = 'http://localhost:8000/api'

export const forgotPasswordService    = async (formData) => (await axios.post(`${API_URL}/solicitar-cambio/`, formData)).data
export const registerPacienteService  = async (formData) => (await axios.post(`${API_URL}/usuarios/registro/`, formData)).data
export const registerMedicoService    = async (formData) => (await axios.post(`${API_URL}/medicos/registro/`, formData)).data
export const getCiudadesByDepartamentoService = async (id) => (await axios.get(`${API_URL}/catalogos/departamentos/${id}/ciudades/`)).data

export const loginService          = async (formData) => (await api.post('/login/', formData)).data
export const resetPasswordService  = async (formData) => (await api.post('/cambiar-contrasena/', formData)).data
export const logoutService = async () => {
    const response = await api.post(`${API_URL}/logout/`);
    return response.data;
}