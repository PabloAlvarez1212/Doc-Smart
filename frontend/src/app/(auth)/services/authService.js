import api from "./api";

export const forgotPasswordService = async (formData) =>
    (await api.post("/solicitar-cambio/", formData)).data;

export const registerPacienteService = async (formData) =>
    (await api.post("/usuarios/registro/", formData)).data;

export const registerMedicoService = async (formData) =>
    (await api.post("/medicos/registro/", formData)).data;

export const getCiudadesByDepartamentoService = async (id) =>
    (
        await api.get(
            `/catalogos/departamentos/${id}/ciudades/`
        )
    ).data;

export const loginService = async (formData) =>
    (await api.post("/login/", formData)).data;

export const resetPasswordService = async (formData) =>
    (await api.post("/cambiar-contrasena/", formData)).data;

export const logoutService = async () => {
    const response = await api.post("/logout/");
    return response.data;
};