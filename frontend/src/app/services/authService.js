import axios from 'axios'
const API_URL = 'http://localhost:8000/api' //Url de la api del back
//formData = body
export const loginService = async (formData) => {
    const response = await axios.post(`${API_URL}/login/`, formData, { //Envia Un solicitud post al back con el enpoint correspodiente al login
        withCredentials: true  // para enviar y recibir cookies
    })
    return response.data //retorna respuesta del back
}

export const forgotPasswordService = async (formData) => {
    const response = await axios.post(`${API_URL}/solicitar-cambio/`, formData)
    return response.data
}

export const resetPassword = async (formData) =>{
    const response = await axios.post(`${API_URL}/cambiar-contraseña/`,formData);
    return response.data;
}