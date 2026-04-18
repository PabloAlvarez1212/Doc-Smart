export const forgotPasswordValidate = ({correo}) =>{
    const errors = {};
    if (!correo) {
        errors.correo = 'El correo es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errors.correo = 'El correo no es válido'
    }

    return errors
}