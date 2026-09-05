import api from "./api";


export const listarHistorialPacienteService = async ({
    page = 1,
    pageSize = 6,
    ordering = "-fecha_creacion",
    signal,
} = {}) => {
    const response = await api.get("/historial/paciente/", {
        params: {
            page,
            page_size: pageSize,
            ordering,
        },
        signal,
    });

    return response.data.data;
};


export const obtenerHistorialClinicoService = async (historialId, { signal } = {}) => {
    const response = await api.get(`/historial/${historialId}/`, { signal });

    return response.data.data;
};
