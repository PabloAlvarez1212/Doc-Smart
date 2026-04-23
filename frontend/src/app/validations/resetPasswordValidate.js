export default function ResetPasswordValidate(formData) {
    const errors = {}

    const { nueva_contraseña, confirmarContraseña } = formData

    if (!nueva_contraseña) {
        errors.nueva_contraseña = "La nueva contraseña es obligatoria."
    }

    if (!confirmarContraseña) {
        errors.confirmarContraseña = "Debes confirmar la contraseña."
    }

    if (
        nueva_contraseña &&
        confirmarContraseña &&
        nueva_contraseña !== confirmarContraseña
    ) {
        errors.confirmarContraseña = "Las contraseñas no coinciden."
    }

    return errors
}