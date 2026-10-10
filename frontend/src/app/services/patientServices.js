import api from "./api";

export const solicitarCambioCorreoService = async (correo) =>
    (await api.post("/perfil/correo/solicitar-cambio/", { correo })).data;

export const confirmarCambioCorreoService = async (cambio_id, codigo) =>
    (await api.post("/perfil/correo/confirmar-cambio/", { cambio_id, codigo })).data;

export const obtenerDashboardPacienteInicioService = async function () {
    const response = await api.get(
        "/dashboard/inicio/paciente/"
    );
    return response.data;
};

export const obtenerPerfilPacienteService = async function () {
    const response = await api.get("/perfil/");
    return response.data;
};

export const eliminarPacienteService = async function () {
    const response = await api.delete("/perfil/");
    return response.data;
};

export const actualizarPerfilPacienteService = async function (formData) {
    const response = await api.put(
        "/perfil/",
        formData
    );
    return response.data;
};

export const actualizarFotoPerfilPacienteService = async (archivo) => {
    const formData = new FormData();

    formData.append("foto_perfil", archivo);

    const response = await api.patch(
        "/perfil/foto/",
        formData
    );

    return response.data;
};

export const eliminarFotoPerfilPacienteService = async () => {
    const response = await api.delete(
        "/perfil/foto/"
    );

    return response.data;
};