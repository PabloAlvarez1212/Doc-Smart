export const crearEspecialidadService = async function (formData){
    const response = await axios.post(`${API_URL}medicos/especialidades/`, formData)
    return response.data
}
export const getEspecialidadesService = async () => {
    const response = await axios.get(`${API_URL}/medicos/especialidades/`)
    return response.data
}