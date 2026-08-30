import axios from "axios";
import Swal from "sweetalert2";

let mostrandoSesionExpirada = false;

let refrescando = false;
let cola = [];

// CSRF
let csrfToken = null;
let csrfPromise = null;

const api = axios.create({
    baseURL: "/api",
    withCredentials: true,
});

// ======================================================
// CSRF
// ======================================================

const obtenerCsrfToken = async () => {
    // Ya lo tenemos en memoria
    if (csrfToken) {
        return csrfToken;
    }

    // Si otra petición ya lo está solicitando,
    // esperamos la misma petición.
    if (csrfPromise) {
        return csrfPromise;
    }

    csrfPromise = api
        .get("/csrf/")
        .then(response => {
            csrfToken =
                response?.data?.data?.csrf_token || null;

            return csrfToken;
        })
        .finally(() => {
            csrfPromise = null;
        });

    return csrfPromise;
};


// Agregar CSRF automáticamente a métodos que modifican datos
api.interceptors.request.use(
    async config => {
        const metodo = config.method?.toLowerCase();

        const requiereCsrf = [
            "post",
            "put",
            "patch",
            "delete",
        ].includes(metodo);

        const url = config.url || "";

        // Evitamos que /csrf/ intente solicitarse a sí mismo
        const esCsrf =
            url.includes("/csrf/") ||
            url.includes("/csrf");

        if (requiereCsrf && !esCsrf) {
            const token = await obtenerCsrfToken();

            if (token) {
                config.headers = config.headers || {};
                config.headers["X-CSRFToken"] = token;
            }
        }

        return config;
    },

    error => Promise.reject(error)
);


// ======================================================
// COLA DE PETICIONES DURANTE REFRESH
// ======================================================

const resolverCola = (error = null) => {
    cola.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve();
        }
    });

    cola = [];
};


// ======================================================
// SESIÓN EXPIRADA
// ======================================================

const cerrarSesionPorExpiracion = async () => {
    if (mostrandoSesionExpirada) return;

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
};


// ======================================================
// INTERCEPTOR DE RESPUESTAS / REFRESH TOKEN
// ======================================================

api.interceptors.response.use(
    response => response,

    async error => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const url = originalRequest?.url || "";

        const esLogin =
            url.includes("/login/") ||
            url.includes("/login");

        const esRefresh =
            url.includes("/refresh/") ||
            url.includes("/refresh");


        // Cualquier error distinto de 401
        // se devuelve normalmente.
        if (status !== 401) {
            return Promise.reject(error);
        }


        // Si las credenciales del login son incorrectas,
        // no intentamos renovar sesión.
        if (esLogin) {
            return Promise.reject(error);
        }


        // Si falla el propio refresh,
        // ya no podemos renovar la sesión.
        if (esRefresh) {
            await cerrarSesionPorExpiracion();

            return Promise.reject(error);
        }


        // Evitar ciclos infinitos.
        if (originalRequest._retry) {
            await cerrarSesionPorExpiracion();

            return Promise.reject(error);
        }

        originalRequest._retry = true;


        // Si ya hay otro refresh ejecutándose,
        // esta petición espera.
        if (refrescando) {
            return new Promise((resolve, reject) => {
                cola.push({
                    resolve: () => {
                        resolve(
                            api(originalRequest)
                        );
                    },

                    reject,
                });
            });
        }


        refrescando = true;

        try {
            // refresh_token viaja automáticamente
            // gracias a withCredentials.
            await api.post(
                "/refresh/",
                {}
            );

            // Liberamos las peticiones que estaban esperando.
            resolverCola();

            // Repetimos la petición que originalmente dio 401.
            return api(originalRequest);

        } catch (refreshError) {
            resolverCola(refreshError);

            await cerrarSesionPorExpiracion();

            return Promise.reject(refreshError);

        } finally {
            refrescando = false;
        }
    }
);

export default api;