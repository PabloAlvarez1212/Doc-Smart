import api from "./api"

export const getPacientesService = async () =>
    (await api.get('/usuarios/')).data

export const deletePacienteService = async (id) =>
    (await api.delete(`/usuarios/${id}/`)).data

export const getDoctoresService = async () =>
    (await api.get('/medicos/')).data

export const deleteDoctorService = async (id) =>
    (await api.delete(`/medicos/${id}/`)).data