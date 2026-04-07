export const validateLogin = ({ correo, contraseña }) => {
    const errors = {}

    // Validar correo
    if (!correo) {
        errors.correo = 'El correo es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errors.correo = 'El correo no es válido'
    }

    // Validar contraseña
    if (!contraseña) {
        errors.contraseña = 'La contraseña es requerida'
    }

    return errors
}