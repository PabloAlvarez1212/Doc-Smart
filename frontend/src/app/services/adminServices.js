import axios from "axios";

const API_URL = "http://localhost:8000/api/";

export const getPacientesService = async (page, search) => {
    const response = await axios.get(`${API_URL}usuarios/`, {
        withCredentials: true,
        params: {
            page,
            page_size: page ? 10 : undefined,
            search: search || undefined,
        },
    });

    return response.data;
};

export const deletePacienteService = async (id) => {
    const response = await axios.delete(`${API_URL}usuarios/${id}/`, {
        withCredentials: true,
    });

    return response.data;
};

export const getDoctoresService = async () => {
    const response = await axios.get(`${API_URL}medicos/`, {
        withCredentials: true,
    });

    return response.data;
};

export const deleteDoctorService = async (id) => {
    const response = await axios.delete(`${API_URL}medicos/${id}/`, {
        withCredentials: true,
    });

    return response.data;
}