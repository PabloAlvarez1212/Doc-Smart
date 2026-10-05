import api from "./api";

export const marcarInasistenciaPacienteService = async (id_cita) => {
    const response = await api.put(`/citas/${id_cita}/inasistencia/`, {});
    return response.data;
};


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

export const resumenCitasMedicoService  = async () => {
    const response = await api.get(
        "/citas/medico/resumen/"
    )    

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
    try {
        const response = await api.put(`/citas/${id_cita}/`, {
            fecha_programada,
        });

        return response.data;
    } catch (error) {
        console.error("Detalle de reprogramación:", {
            estado: error.response?.status,
            respuesta: error.response?.data,
            datosEnviados: error.config?.data,
        });

        throw error;
    }
};



// ==========================================
// REGISTRAR CITA
// ==========================================

export const registrarCitaService = async (datos) => {

    const response = await api.post(
        "/citas/registrar/",
        datos
    );

    return response.data;
};
