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


export const completarCitaService = async (id_cita, datosClinicos) => {

    const response = await api.put(
        `/citas/${id_cita}/completar/`, datosClinicos
    );

    return response.data;
};

export const listarDocumentosSeguimientoCitaService = async (id_cita) => {
    const response = await api.get(
        `/citas/${id_cita}/documentos/`
    );

    return response.data?.data ?? response.data;
};

export const obtenerUrlDocumentoSeguimientoService = async (citaId, documentoId) => {
    const response = await api.get(`/citas/${citaId}/documentos/${documentoId}/url/`);
    return response.data.data;
};


export const subirDocumentosSeguimientoCitaService = async (id_cita,archivos) => {
    const formData = new FormData();

    archivos.forEach((archivo) => {
        formData.append(
            "archivos",
            archivo
        );
    });

    const response = await api.post(
        `/citas/${id_cita}/documentos/`,
        formData
    );

    return response.data?.data ?? response.data;
};

export const reprogramarCitaService = async (
    id_cita,
    fecha_programada
) => {
    const response = await api.put(`/citas/${id_cita}/`, {
        fecha_programada,
    });

    return response.data;
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
