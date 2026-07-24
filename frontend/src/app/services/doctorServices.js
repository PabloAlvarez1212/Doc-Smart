const API_URL = 'http://localhost:8000/api/'
import axios from 'axios';
import api from './api';

//crear una especialidad
export const crearEspecialidadService = async function (formData){
    const response = await api.post(`${API_URL}medicos/especialidades/`, formData)
    return response.data
}

// obtener todas las especialidades (paginado)
export const getEspecialidadesService = async (page, search) => {
    const response = await axios.get(`${API_URL}medicos/especialidades/`, {
        params: {
            page,
            page_size: page ? 10 : undefined,
            search: search || undefined,
        },
    })
    return response.data
}

// actualizar un especialidad
export const editarEspecialidadService = async function (id, formData) {
    const response = await api.put(
        `${API_URL}medicos/especialidad/${id}/`,
        formData
    );
    return response.data;
};

// eliminar un especialidad
export const eliminarEspecialidadService = async function (id) {
    const response = await api.delete(`${API_URL}medicos/especialidad/${id}/`);
    return response.data;
};