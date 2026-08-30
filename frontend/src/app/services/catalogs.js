import api from "./api";

// ===========================ROLES===========================

export const crearRolService = async function (formData) {
    const response = await api.post(
        "/catalogos/roles/",
        formData
    );

    return response.data;
};

export const getRolesService = async function () {
    const response = await api.get(
        "/catalogos/roles/"
    );

    return response.data;
};

export const editarRolService = async function (id, formData) {
    const response = await api.put(
        `/catalogos/roles/${id}/`,
        formData
    );

    return response.data;
};

export const eliminarRolService = async function (id) {
    const response = await api.delete(
        `/catalogos/roles/${id}/`
    );

    return response.data;
};

// ===========================ESTADOS===========================

export const crearEstadosService = async function (formData) {
    const response = await api.post(
        "/catalogos/estados/",
        formData
    );

    return response.data;
};

export const getEstadosService = async function () {
    const response = await api.get(
        "/catalogos/estados/"
    );

    return response.data;
};

export const editarEstadosService = async function (id, formData) {
    const response = await api.put(
        `/catalogos/estados/${id}/`,
        formData
    );

    return response.data;
};

export const eliminarEstadosService = async function (id) {
    const response = await api.delete(
        `/catalogos/estados/${id}/`
    );

    return response.data;
};

// ===========================MEDIOS===========================

export const crearMediosService = async function (formData) {
    const response = await api.post(
        "/catalogos/medios/",
        formData
    );

    return response.data;
};

export const getMediosService = async function () {
    const response = await api.get(
        "/catalogos/medios/"
    );

    return response.data;
};

export const editarMediosService = async function (id, formData) {
    const response = await api.put(
        `/catalogos/medios/${id}/`,
        formData
    );

    return response.data;
};

export const eliminarMediosService = async function (id) {
    const response = await api.delete(
        `/catalogos/medios/${id}/`
    );

    return response.data;
};

// ===========================CIUDADES===========================

export const getCiudadesService = async function (page = 1, search = "") {
    const response = await api.get(
        "/catalogos/ciudades/",
        {
            params: {
                page,
                page_size: 10,
                search: search || undefined,
            },
        }
    );

    return response.data;
};

export const getCiudadesPorDepartamentoService = async function (idDepartamento) {
    const response = await api.get(
        `/catalogos/departamentos/${idDepartamento}/ciudades/`
    );

    return response.data.data;
};

// ===========================DEPARTAMENTOS===========================

export const getDepartamentosService = async (page, search) => {
    const response = await api.get(
        "/catalogos/departamentos/",
        {
            params: {
                page,
                page_size: page ? 10 : undefined,
                search: search || undefined,
            },
        }
    );

    return response.data;
};