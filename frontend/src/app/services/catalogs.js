import axios from 'axios'
import api from './api'
const API_URL = 'http://localhost:8000/api/'

//Metodos post

//===========================ROLES===========================

//Crear rol 
export const crearRolService = async function (formData){
    const response = await api.post(`${API_URL}catalogos/roles/`, formData)
    return response.data
}
// Obtener todos los roles
export const getRolesService = async function () {
    const response = await api.get(`${API_URL}catalogos/roles/`)
    return response.data
}

// Editar un rol
export const editarRolService = async function (id, formData) {
    const response = await api.put(`${API_URL}catalogos/roles/${id}/`, formData)
    return response.data
}

// Eliminar un rol
export const eliminarRolService = async function (id) {
    const response = await api.delete(`${API_URL}catalogos/roles/${id}/`)
    return response.data
}





//===========================ESTADOS===========================
//crear estado
export const crearEstadosService = async function (formData){
    const response = await api.post(`${API_URL}catalogos/estados/`, formData)
    return response.data
}

// obtener todos los estados
export const getEstadosService = async function () {
    const response = await api.get(`${API_URL}catalogos/estados/`);
    return response.data;
};

// editar un estado
export const editarEstadosService = async function (id, formData) {
    const response = await api.put(`${API_URL}catalogos/estados/${id}/`, formData);
    return response.data;
};

// eliminar un estado
export const eliminarEstadosService = async function (id) {
    const response = await api.delete(`${API_URL}catalogos/estados/${id}/`);
    return response.data;
};





//===========================MEDIOS===========================
// crear medio
export const crearMediosService = async function (formData){
    const response = await api.post(`${API_URL}catalogos/medios/`, formData)
    return response.data
}
// obtener todos los medios
export const getMediosService = async function () {
    const response = await api.get(`${API_URL}catalogos/medios/`);
    return response.data;
};

// actualizar un medio
export const editarMediosService = async function (id, formData) {
    const response = await api.put(`${API_URL}catalogos/medios/${id}/`, formData);
    return response.data;
};

// eliminar un medio
export const eliminarMediosService = async function (id) {
    const response = await api.delete(`${API_URL}catalogos/medios/${id}/`);
    return response.data;
};





//===========================CIUDADES===========================

// Obtener todas las ciudades
export const getCiudadesService = async function () {
    const response = await axios.get(`${API_URL}catalogos/ciudades/`);
    return response.data;
};

// Obtener ciudades por departamento
export const getCiudadesPorDepartamentoService = async function (idDepartamento) {
    const response = await axios.get(
        `${API_URL}catalogos/departamentos/${idDepartamento}/ciudades/`
    );

    return response.data;
};




//===========================DEPARTAMENTOS===========================
export const getDepartamentosService = async () => {
    const response = await axios.get(`${API_URL}catalogos/departamentos/`)
    return response.data
}
