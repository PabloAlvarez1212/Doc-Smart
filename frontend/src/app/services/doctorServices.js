const API_URL = 'http://localhost:8000/api/'

import axios from 'axios';
import api from './api';


// ==========================================
// ESPECIALIDADES
// ==========================================

// Crear una especialidad
export const crearEspecialidadService = async function (formData) {
    const response = await api.post(
        `${API_URL}medicos/especialidades/`,
        formData
    );

    return response.data;
};


// Obtener todas las especialidades (paginado)
export const getEspecialidadesService = async (page, search) => {
    const response = await axios.get(
        `${API_URL}medicos/especialidades/`,
        {
            params: {
                page,
                page_size: page ? 10 : undefined,
                search: search || undefined,
            },
        }
    );

    return response.data.data;
};


// Actualizar una especialidad
export const editarEspecialidadService = async function (id, formData) {
    const response = await api.put(
        `${API_URL}medicos/especialidad/${id}/`,
        formData
    );

    return response.data;
};


// Eliminar una especialidad
export const eliminarEspecialidadService = async function (id) {
    const response = await api.delete(
        `${API_URL}medicos/especialidad/${id}/`
    );

    return response.data;
};


// ==========================================
// DASHBOARD DEL MÉDICO
// ==========================================

// Obtener dashboard inicio del médico
export const obtenerDashboardMedicoInicioService = async function () {
    const response = await api.get(
        `${API_URL}medicos/dashboard/inicio/`
    );

    return response.data;
};


// ==========================================
// PERFIL DEL MÉDICO
// ==========================================

// Obtener perfil del médico
export const obtenerPerfilMedicoService = async function () {
    const response = await api.get(
        "/medicos/perfil/"
    );

    return response.data;
};


// Actualizar información del perfil del médico
export const actualizarPerfilMedicoService = async function (formData) {
    const response = await api.put(
        "/medicos/perfil/",
        formData
    );

    return response.data;
};


// Actualizar foto de perfil del médico
export const actualizarFotoPerfilMedicoService = async function (archivo) {

    const formData = new FormData();

    formData.append("foto_perfil", archivo);

    const response = await api.patch(
        "/medicos/perfil/foto/",
        formData
    );

    return response.data;
};


// Eliminar foto de perfil del médico
export const eliminarFotoPerfilMedicoService = async function () {

    const response = await api.delete(
        "/medicos/perfil/foto/"
    );

    return response.data;
};