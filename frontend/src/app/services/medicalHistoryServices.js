import api from "./api";


export const listarHistorialPacienteService = async ({
    page = 1,
    pageSize = 6,
    ordering = "-fecha_creacion",
    search = "",
    period = "all",
    doctor = "all",
    signal,
} = {}) => {
    const params = {
        page,
        page_size: pageSize,
        ordering,
    };
    const normalizedSearch = search.trim();

    if (normalizedSearch) params.search = normalizedSearch;
    if (period !== "all") params.period = period;
    if (doctor !== "all") params.doctor = doctor;

    const response = await api.get("/historial/paciente/", {
        params,
        signal,
    });

    return response.data.data;
};


export const listarProfesionalesHistorialPacienteService = async ({ signal } = {}) => {
    const response = await api.get("/historial/paciente/profesionales/", { signal });

    return Array.isArray(response.data.data) ? response.data.data : [];
};


export const obtenerHistorialClinicoService = async (historialId, { signal } = {}) => {
    const response = await api.get(`/historial/${historialId}/`, { signal });

    return response.data.data;
};
