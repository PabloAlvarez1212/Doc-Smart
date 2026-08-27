import api from "./api";


// ==========================================
// LISTAR CITAS
// ==========================================

export const listarCitasPacienteService = async (params = {}) => {

    const response = await api.get(
        "/citas/paciente/",
        {
            params,
        }
    );

    return response.data.data;
};


export const listarCitasMedicoService = async (params = {}) => {

    const response = await api.get(
        "/citas/medico/",
        {
            params,
        }
    );

    return response.data.data;
};


// ==========================================
// ACCIONES SOBRE CITAS
// ==========================================

export const cancelarCitaService = async (id_cita) => {

    const response = await api.put(
        `/citas/${id_cita}/cancelar/`
    );

    return response.data;
};


export const confirmarCitaService = async (id_cita) => {

    const response = await api.put(
        `/citas/${id_cita}/confirmar/`
    );

    return response.data;
};


export const completarCitaService = async (id_cita) => {

    const response = await api.put(
        `/citas/${id_cita}/completar/`
    );

    return response.data;
};


export const reprogramarCitaService = async (
    id_cita,
    fecha_programada
) => {

    const response = await api.put(
        `/citas/${id_cita}/`,
        {
            fecha_programada,
        }
    );

    return response.data;
};