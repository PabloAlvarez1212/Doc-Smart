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

export const listarMedicosDisponiblesServices = async function (filtros = {}) {
    const response = await api.get("/medicos/disponibles/", {
        params: filtros
    });

    return response.data;
}

export const obtenerMiValidacionMedicoService = async (signal) => {
    const response = await api.get(
        "/medicos/mi-validacion/",
        { signal }
    );

    return response.data;
};

export const reintentarSolicitudValidacionService = async (archivo, signal) => {
    const formData = new FormData();

    formData.append("hoja_vida", archivo);

    const response = await api.post(
        "/medicos/mi-validacion/reintentar/",
        formData,
        { signal }
    );

    return response.data;
};


// ==========================================
// DISPONIBILIDAD DEL MÉDICO
// ==========================================

export const obtenerDisponibilidadMedicoService =
    async function () {

        const response = await api.get(
            "/medicos/disponibilidad/"
        );

        return response.data;
    };


export const actualizarDisponibilidadMedicoService =
    async function (datos) {

        const response = await api.put(
            "/medicos/disponibilidad/",
            datos
        );

        return response.data;
    };


export const obtenerExcepcionesDisponibilidadService =
    async function () {
        const response = await api.get(
            "/medicos/disponibilidad/excepciones/"
        );

        return response.data;
    };


export const crearExcepcionDisponibilidadService =
    async function (datos) {
        const response = await api.post(
            "/medicos/disponibilidad/excepciones/fecha/",
            datos
        );

        return response.data;
    };


export const actualizarExcepcionDisponibilidadService =
    async function (fecha, datos) {
        const response = await api.put(
            `/medicos/disponibilidad/excepciones/fecha/${fecha}/`,
            datos
        );

        return response.data;
    };


export const eliminarExcepcionDisponibilidadService =
    async function (fecha) {
        const response = await api.delete(
            `/medicos/disponibilidad/excepciones/fecha/${fecha}/`
        );

        return response.data;
    };

// ==========================================
// DISPONIBILIDAD PÚBLICA DEL MÉDICO
// ==========================================

export const obtenerDiasDisponiblesMedicoService = async function (
    medicoId,
    desde,
    hasta
) {
    const response = await api.get(
        `/medicos/${medicoId}/dias-disponibles/`,
        {
            params: {
                desde,
                hasta,
            },
        }
    );

    return response.data;
};

export const obtenerHorariosDisponiblesMedicoService = async function (
    medicoId,
    fecha
) {
    const response = await api.get(
        `/medicos/${medicoId}/horarios-disponibles/`,
        {
            params: {
                fecha,
            },
        }
    );

    return response.data;
};