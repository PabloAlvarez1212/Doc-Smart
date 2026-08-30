import api from "./api";

// ==========================================
// ESPECIALIDADES
// ==========================================

export const crearEspecialidadService = async function (formData) {
    const response = await api.post(
        "/medicos/especialidades/",
        formData
    );

    return response.data;
};

export const getEspecialidadesService = async (page, search) => {
    const response = await api.get(
        "/medicos/especialidades/",
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

export const editarEspecialidadService = async function (id, formData) {
    const response = await api.put(
        `/medicos/especialidad/${id}/`,
        formData
    );

    return response.data;
};

export const eliminarEspecialidadService = async function (id) {
    const response = await api.delete(
        `/medicos/especialidad/${id}/`
    );

    return response.data;
};

// ==========================================
// DASHBOARD DEL MÉDICO
// ==========================================

export const obtenerDashboardMedicoInicioService = async function () {
    const response = await api.get(
        "/medicos/dashboard/inicio/"
    );

    return response.data;
};

// ==========================================
// PERFIL DEL MÉDICO
// ==========================================

export const obtenerPerfilMedicoService = async function () {
    const response = await api.get(
        "/medicos/perfil/"
    );

    return response.data;
};

export const actualizarPerfilMedicoService = async function (formData) {
    const response = await api.put(
        "/medicos/perfil/",
        formData
    );

    return response.data;
};

export const eliminarCuentaMedicoService = async function () {
    const response = await api.delete(
        "/medicos/perfil/"
    );

    return response.data;
};

export const actualizarFotoPerfilMedicoService = async function (archivo) {
    const formData = new FormData();

    formData.append("foto_perfil", archivo);

    const response = await api.patch(
        "/medicos/perfil/foto/",
        formData
    );

    return response.data;
};

export const eliminarFotoPerfilMedicoService = async function () {
    const response = await api.delete(
        "/medicos/perfil/foto/"
    );

    return response.data;
};