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

export const resetPasswordService = async (formData) =>{
    const response = await axios.post(`${API_URL}/cambiar-contraseña/`,formData,{
        withCredentials: true
    });
    return response.data;
}

// Registro paciente → POST /api/registro/
export const registerPacienteService = async (formData) => {
  const response = await axios.post(`${API_URL}/usuarios/registro/`, formData);
  return response.data;
};

// Registro médico → POST /api/medicos/
export const registerMedicoService = async (formData) => {
  const response = await axios.post(`${API_URL}/medicos/registro/`, formData);
  return response.data;
};

// Cargar especialidades (para el select del médico)
export const getEspecialidadesService = async () => {
  const response = await axios.get(`${API_URL}/medicos/especialidades/`);
  return response.data;
};