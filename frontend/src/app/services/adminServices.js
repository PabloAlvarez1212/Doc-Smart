import api from "./api"

export const getPacientesService = async (page, search) =>
    (await api.get('/usuarios/', { params: { page, page_size: 10, search } })).data

export const deletePacienteService = async (id) =>
    (await api.delete(`/usuarios/${id}/`)).data

export const getDoctoresService = async (page, search) =>
    (await api.get('/medicos/', { params: { page, page_size: 10, search } })).data

export const deleteDoctorService = async (id) =>
    (await api.delete(`/medicos/${id}/`)).data

export const listarSolicitudesMedicosValidacionService = async function (filtros = {}) {
    const response = await api.get("/medicos/solicitudes-validacion/", {
        params: filtros
    });

    return response.data;
}

export const obtenerMetricasValidacionMedicosService = async () => {
    const response = await api.get(
        "/medicos/solicitudes-validacion/metricas/"
    )

    return response.data
}