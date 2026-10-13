export const passwordRequirements = [
    {
        id: "length",
        label: "Mínimo 8 caracteres",
        test: (value) => value.length >= 8,
        error: "La contraseña debe tener mínimo 8 caracteres",
    },
    {
        id: "allowed",
        label: "Sin <, >, comillas, barra invertida ni &",
        test: (value) => Boolean(value) && !/[<>\\"'&]/.test(value),
        error: "No se permiten los caracteres (<, >, comillas, barra invertida o &) en la contraseña",
    },
    {
        id: "special",
        label: "Un carácter especial",
        test: (value) => /[^a-zA-Z0-9]/.test(value) && !/[<>\\"'&]/.test(value),
        error: "La contraseña debe contener al menos un carácter especial",
    },
    {
        id: "uppercase",
        label: "Una letra mayúscula",
        test: (value) => /[A-Z]/.test(value),
        error: "La contraseña debe tener mínimo una mayúscula",
    },
    {
        id: "lowercase",
        label: "Una letra minúscula",
        test: (value) => /[a-z]/.test(value),
        error: "La contraseña debe tener mínimo una minúscula",
    },
    {
        id: "number",
        label: "Un número",
        test: (value) => /\d/.test(value),
        error: "La contraseña debe tener mínimo un número",
    },
];

export const getPasswordRequirements = (value = "") =>
    passwordRequirements.map((requirement) => ({
        ...requirement,
        met: requirement.test(value),
    }));

export default function ResetPasswordValidate(formData) {
    const errors = {};
    const { nueva_contraseña = "", confirmarContraseña = "" } = formData;

    if (!nueva_contraseña) {
        errors.nueva_contraseña = "La nueva contraseña es obligatoria.";
    } else {
        const unmetRequirement = passwordRequirements.find(
            (requirement) => !requirement.test(nueva_contraseña),
        );
        if (unmetRequirement) errors.nueva_contraseña = unmetRequirement.error;
    }

    if (!confirmarContraseña) {
        errors.confirmarContraseña = "Debes confirmar la contraseña.";
    } else if (nueva_contraseña !== confirmarContraseña) {
        errors.confirmarContraseña = "Las contraseñas no coinciden.";
    }

    return errors;
}
