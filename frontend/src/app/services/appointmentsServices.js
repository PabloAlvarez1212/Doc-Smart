import api from './api'
export const listarCitasPacienteService = async (params = {}) => {
    const response = await api.get(
        "/citas/paciente/",
        {
            params,
        }
    );

    return response.data.data;

};

export const cancelarCitaService = async (id_cita) => {
    const response = await api.put(
        `/citas/${id_cita}/cancelar/`);
    return response.data.data;
};