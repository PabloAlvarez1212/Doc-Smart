import api from "./api";

export const forgotPasswordService = async (formData) =>
    (await api.post("/solicitar-cambio/", formData)).data;

// REGISTRO PACIENTE
export const iniciarRegistroPacienteService = async (data) =>
    (await api.post("/usuarios/registro/", data)).data;

export const guardarDatosAdicionalesRegistroService = async (data) =>
    (await api.post("/usuarios/registro/datos-adicionales/", data)).data;

export const configurarCredencialesRegistroService = async (data) =>
    (await api.post("/usuarios/registro/credenciales/", data)).data;

export const reenviarCodigoRegistroService = async (data) =>
    (await api.post("/usuarios/registro/reenviar-codigo/", data)).data;

export const verificarCorreoRegistroService = async (data) =>
    (await api.post("/usuarios/registro/verificar-correo/", data)).data;

export const subirDocumentoRegistroService = async (formData) =>
    (await api.post("/usuarios/registro/subir-documento/", formData)).data;

export const verificarDocumentoRegistroService = async (data) =>
    (await api.post("/usuarios/registro/documento/verificar/", data)).data;

export const completarRegistroPacienteService = async (data) =>
    (await api.post("/usuarios/registro/completar/", data)).data;

// REGISTRO MÉDICO
export const registerMedicoService = async (formData) =>
    (await api.post("/medicos/registro/", formData)).data;

export const getCiudadesByDepartamentoService = async (id) =>
    (await api.get(`/catalogos/departamentos/${id}/ciudades/`)).data;

export const loginService = async (formData) =>
    (await api.post("/login/", formData)).data;

export const resetPasswordService = async (formData) =>
    (await api.post("/cambiar-contraseña/", formData)).data;

export const logoutService = async () => {
    const response = await api.post("/logout/");
    return response.data;
};

export const cambiarContraseñaAuthService = async (data) => {
    const response = await api.post("/cambiar-contraseña-auth/", data);
    return response.data;
};
