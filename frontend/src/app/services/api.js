import axios from "axios";
import Swal from "sweetalert2";

let mostrandoSesionExpirada = false;

const api = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,

    async (error) => {

        const url = error.config?.url;

        const esLogin =
            url?.includes("/login/") ||
            url?.includes("/login");

        if (
            error.response?.status === 401 &&
            !esLogin &&
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