import api from "./api"

export const getPacientesService = async (page, search) =>
    (await api.get('/usuarios/', { params: { page, page_size: 10, search } })).data

export const deletePacienteService = async (id) =>
    (await api.delete(`/usuarios/${id}/`)).data

export const getDoctoresService = async (page, search) =>
    (await api.get('/medicos/', { params: { page, page_size: 10, search } })).data

export const deleteDoctorService = async (id) =>
    (await api.delete(`/medicos/${id}/`)).data