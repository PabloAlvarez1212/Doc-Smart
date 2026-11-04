
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

export const anularSancionService = async (sancionId) => {
    const response = await api.patch(
        `/reportes/sanciones/${sancionId}/anular/`
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