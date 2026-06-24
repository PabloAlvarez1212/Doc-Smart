import axios from 'axios'

const API_URL = 'http://localhost:8000/api/'

//Metodos post
export const crearRolService = async function (formData){
    const response = await axios.post(`${API_URL}catalogos/roles/`, formData)
    return response.data
}
export const crearEstadosService = async function (formData){
    const response = await axios.post(`${API_URL}catalogos/estados/`, formData)
    return response.data
}
export const crearMediosService = async function (formData){
    const response = await axios.post(`${API_URL}catalogos/medios/`, formData)
    return response.data
}
export const crearCiudadService = async function (formData){
    const response = await axios.post(`${API_URL}catalogos/ciudades/`, formData)
    return response.data
}

//Metodos get
export const getDepartamentosService = async () => {
    const response = await axios.get(`${API_URL}catalogos/departamentos/`)
    return response.data
}