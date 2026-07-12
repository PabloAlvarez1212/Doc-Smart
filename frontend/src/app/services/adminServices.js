import axios from "axios";

const API_URL = "http://localhost:8000/api/";

export const getPacientesService = async () => {
    const response = await axios.get(`${API_URL}usuarios/`, {
        withCredentials: true,
    });

    return response.data;
};

export const deletePacienteService = async (id) => {
    const response = await axios.delete(`${API_URL}usuarios/${id}/`, {
        withCredentials: true,
    });

    return response.data;
};