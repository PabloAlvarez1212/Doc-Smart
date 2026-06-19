import axios from 'axios'

const API_URL = 'http://localhost:8000/api'

export const loginService = async (formData) => {
    const response = await axios.post(`${API_URL}/login/`, formData, {
        withCredentials: true
    })
    return response.data
}

export const forgotPasswordService = async (formData) => {
    const response = await axios.post(`${API_URL}/solicitar-cambio/`, formData)
    return response.data
}

export const resetPasswordService = async (formData) => {
    const response = await axios.post(`${API_URL}/cambiar-contraseña/`, formData, {
        withCredentials: true
    })
    return response.data
}

export const registerPacienteService = async (formData) => {
    const response = await axios.post(`${API_URL}/usuarios/registro/`, formData)
    return response.data
}

export const registerMedicoService = async (formData) => {
    const response = await axios.post(`${API_URL}/medicos/registro/`, formData)  // 👈
    return response.data
}




export const getCiudadesByDepartamentoService = async (id_departamento) => {
    const response = await axios.get(`${API_URL}/catalogos/departamentos/${id_departamento}/ciudades/`)
    return response.data
}