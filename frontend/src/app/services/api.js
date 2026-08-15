import axios from "axios";
import Swal from "sweetalert2";

let mostrandoSesionExpirada = false;

const api = axios.create({
    baseURL: "http://localhost:8000/api",
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        if (
            error.response?.status === 401 &&
            !mostrandoSesionExpirada
        ) {
            mostrandoSesionExpirada = true;

            await Swal.fire({
                icon: "warning",
                title: "Sesión expirada",
                text: "Tu sesión ha expirado. Inicia sesión nuevamente.",
                confirmButtonText: "Ir al login",
                allowOutsideClick: false,
                allowEscapeKey: false,
            });

            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);

export default api;