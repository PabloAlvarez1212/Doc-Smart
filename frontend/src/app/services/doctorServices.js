import axios from "axios"
const API_URL = 'http://localhost:8000/api/'

//crear una especialidad
export const crearEspecialidadService = async function (formData){
    const response = await axios.post(`${API_URL}medicos/especialidades/`, formData)
    return response.data
}

// obtener todas las especialidad
export const getEspecialidadesService = async () => {
    const response = await axios.get(`${API_URL}medicos/especialidades/`)
    return response.data
}

// actualizar un especialidad
export const editarEspecialidadService = async function (id, formData) {
    const response = await axios.put(
        `${API_URL}medicos/especialidad/${id}/`,
        formData
    );
    return response.data;
};

// eliminar un especialidad
export const eliminarEspecialidadService = async function (id) {
    const response = await axios.delete(`${API_URL}medicos/especialidad/${id}/`);
    return response.data;
};