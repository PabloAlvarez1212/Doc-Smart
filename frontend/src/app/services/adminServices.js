import api from "./api"

export const getPacientesService = async (page, search, filtros = {}) =>
    (await api.get('/usuarios/', { params: { page, page_size: 10, search, estado: filtros.estado || undefined } })).data

export const getDoctoresService = async (page, search, filtros = {}) =>
    (await api.get('/medicos/', { params: {
        page, page_size: 10, search,
        estado: filtros.estado || undefined,
        especialidad: filtros.especialidad || undefined,
    } })).data

export const cambiarAccesoCuentaService = async (tipo, id, bloqueado, motivo = "") =>
    (await api.patch(`/admin/cuentas/${tipo}/${id}/acceso/`, { bloqueado, motivo })).data

export const listarSolicitudesMedicosValidacionService = async function (filtros = {}, signal) {
    const response = await api.get("/medicos/solicitudes-validacion/", {
        params: { page: 1, page_size: 10, ...filtros },
        signal,
    });

    return response.data;
}

export const obtenerMetricasValidacionMedicosService = async () => {
    const response = await api.get(
        "/medicos/solicitudes-validacion/metricas/"
    )

    return response.data
}

export const obtenerHojaVidaSolicitudService = async (solicitudId) => {
    const response = await api.get(
        `/medicos/solicitudes-validacion/${solicitudId}/hoja-vida/`
    )

    return response.data
}

export const aprobarSolicitudValidacionService = async (solicitudId) => {
    const response = await api.patch(
        `/medicos/solicitudes-validacion/${solicitudId}/aprobar/`
    )

    return response.data
}

export const rechazarSolicitudValidacionService = async (
    solicitudId,
    motivo
) => {
    const response = await api.patch(
        `/medicos/solicitudes-validacion/${solicitudId}/rechazar/`,
        {
            motivo_rechazo: motivo,
        }
    )

    return response.data
}

export const obtenerPerfilAdmin = async () => {
    const response = await api.get("/perfil/admin/");

    return response.data;
};

export const obtenerMetricasSistemaService = async (signal) => {
    const response = await api.get("/admin/dashboard/metricas/", { signal });

    return response.data;
};

export const obtenerEstadisticasCitasService = async (anio, mes, signal) =>{
    const params = {};

    if (Number.isInteger(anio)) {
        params.anio = anio;
    }

    if (Number.isInteger(mes)) {
        params.mes = mes;
    }

    const response = await api.get("/citas/admin/dashboard/", {
        params,
        signal,
    });
    return response.data
}

export const obtenerEstadisticasMedicosService = async (anio, mes, signal) =>{
    const params = {};

    if (Number.isInteger(anio)) {
        params.anio = anio;
    }

    if (Number.isInteger(mes)) {
        params.mes = mes;
    }

    const response = await api.get("/medicos/admin/dashboard/", {
        params,
        signal,
    });
    return response.data
}

export const obtenerEstadisticasPacientesService = async (anio, mes, signal) =>{
    const params = {};

    if (Number.isInteger(anio)) {
        params.anio = anio;
    }

    if (Number.isInteger(mes)) {
        params.mes = mes;
    }

    const response = await api.get("/pacientes/admin/dashboard/", {
        params,
        signal,
    });
    return response.data
}

export const listarRevisionesFacialesService = async (estado = "revision") =>
    (await api.get("/usuarios/facial/revisiones/", { params: { estado } })).data

export const detalleRevisionFacialService = async (procesoId) =>
    (await api.get(`/usuarios/facial/revisiones/${procesoId}/`)).data

export const resolverRevisionFacialService = async (procesoId, decision, motivo) =>
    (await api.post(`/usuarios/facial/revisiones/${procesoId}/`, { decision, ...(motivo ? { motivo } : {}) })).data

export const obtenerIdentidadSolicitudService = async (solicitudId) =>
    (await api.get(`/medicos/solicitudes-validacion/${solicitudId}/identidad/`)).data
