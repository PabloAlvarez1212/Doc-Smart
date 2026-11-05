
import api from "./api";

// ==========================================
// CREAR REPORTE
// ==========================================

export const crearReporteService = async (datos) => {
    const response = await api.post(
        "/reportes/crear/",
        datos
    );

    return response.data;
};


// ==========================================
// LISTAR REPORTES
// ==========================================

export const listarReportesService = async (params = {}) => {
    const response = await api.get(
        "/reportes/listar/",
        { params }
    );

    return response.data.data;
};


// ==========================================
// GESTIONAR REPORTE - ADMIN
// ==========================================

export const gestionarReporteService = async (
    reporteId,
    datos
) => {
    const response = await api.patch(
        `/reportes/gestionar/${reporteId}/`,
        datos
    );

    return response.data;
};


// ==========================================
// ANULAR SANCIÓN - ADMIN
// ==========================================

export const anularSancionService = async (sancionId, motivo) => {
    const response = await api.patch(
        `/reportes/sanciones/${sancionId}/anular/`,
        { motivo }
    );

    return response.data;
};


// ==========================================
// CONSULTAR MI SANCIÓN
// ==========================================

export const obtenerMiSancionService = async () => {
    const response = await api.get(
        "/reportes/mi-sancion/"
    );

    return response.data.data;
};


export const listarUsuariosReportablesService = async () => {
    const response = await api.get(
        "/reportes/usuarios-reportables/"
    );

    return response.data.data;
};


export const obtenerContextoReporteCitaService = async (citaId) => {
    const response = await api.get(
        `/reportes/contexto-cita/${citaId}/`
    );

    return response.data.data;
};

export const listarCitasReportablesService = async (idReportado) => {
    const response = await api.get("/reportes/citas-reportables/", {
        params: { id_reportado: idReportado },
    });
    return response.data.data;
};

export const previsualizarSancionService = async (reporteId, datos) => {
    const response = await api.post(`/reportes/previsualizar/${reporteId}/`, datos);
    return response.data.data;
};

export const descargarEvidenciaReporteService = async (reporteId) => {
    try {
        const response = await api.get(`/reportes/evidencia/${reporteId}/`, { responseType: "blob" });
        return response.data;
    } catch (error) {
        if (error.response?.data instanceof Blob) {
            try {
                error.response.data = JSON.parse(await error.response.data.text());
            } catch { /* Conserva el error HTTP si no contiene JSON. */ }
        }
        throw error;
    }
};
