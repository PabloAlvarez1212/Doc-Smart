export const validateRegisterStep1 = ({ nombre, apellido, cedula, fecha_nacimiento }) => {
    const errors = {}

    if (!nombre) {
        errors.nombre = 'El nombre es requerido'
    } else if (nombre.length < 2) {
        errors.nombre = 'El nombre debe tener mínimo 2 caracteres'
    }

    if (!apellido) {
        errors.apellido = 'El apellido es requerido'
    } else if (apellido.length < 2) {
        errors.apellido = 'El apellido debe tener mínimo 2 caracteres'
    }

    if (!cedula) {
        errors.cedula = 'La cédula es requerida'
    } else if (!/^\d+$/.test(cedula)) {
        errors.cedula = 'La cédula debe contener solo números'
    } else if (cedula.length < 6 || cedula.length > 10) {
        errors.cedula = 'La cédula debe tener entre 6 y 10 dígitos'
    }

    if (!fecha_nacimiento) {
        errors.fecha_nacimiento = 'La fecha de nacimiento es requerida'
    } else {
        const fecha = new Date(fecha_nacimiento)
        const hoy = new Date()
        const edad = hoy.getFullYear() - fecha.getFullYear()
        if (fecha > hoy) {
            errors.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura'
        } else if (edad < 1 || edad > 120) {
            errors.fecha_nacimiento = 'La fecha de nacimiento no es válida'
        }
    }

    return errors
}

export const validateRegisterPacienteStep2 = ({ telefono, estatura, peso }) => {
    const errors = {}

    if (!telefono) {
        errors.telefono = 'El teléfono es requerido'
    } else if (!/^\d+$/.test(telefono)) {
        errors.telefono = 'El teléfono debe contener solo números'
    }

    if (!estatura) {
        errors.estatura = 'La estatura es requerida'
    } else {
        const estaturaNum = parseFloat(String(estatura).replace(',', '.'))
        if (isNaN(estaturaNum) || estaturaNum < 0.5 || estaturaNum > 2.5) {
            errors.estatura = 'La estatura debe estar entre 0.5 y 2.5 metros'
        }
    }

    if (!peso) {
        errors.peso = 'El peso es requerido'
    } else {
        const pesoNum = parseFloat(String(peso).replace(',', '.'))
        if (isNaN(pesoNum) || pesoNum < 1 || pesoNum > 500) {
            errors.peso = 'El peso debe estar entre 1 y 500 kg'
        }
    }

    return errors
}

export const validateRegisterMedicoStep2 = ({ telefono, direccion, departamento_filtro, id_ciudad, id_especialidad }) => {
    const errors = {}

    if (!telefono) {
        errors.telefono = 'El teléfono es requerido'
    } else if (!/^\d+$/.test(telefono)) {
        errors.telefono = 'El teléfono debe contener solo números'
    }

    if (!direccion) {
        errors.direccion = 'La dirección es requerida'
    }

    if (!departamento_filtro) {
        errors.departamento_filtro = 'El departamento es requerido'
    }

    if (!id_ciudad) {
        errors.id_ciudad = 'La ciudad es requerida'
    }

    if (!id_especialidad) {
        errors.id_especialidad = 'La especialidad es requerida'
    }

    return errors
}

export const validateRegisterStep3 = ({ correo, contraseña, confirmar_contraseña }) => {
    const errors = {}

    if (!correo) {
        errors.correo = 'El correo es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errors.correo = 'El correo no tiene un formato válido'
    }

    if (!contraseña) {
        errors.contraseña = 'La contraseña es requerida'
    } else if (contraseña.length < 8) {
        errors.contraseña = 'La contraseña debe tener mínimo 8 caracteres'
    } else if (!/[A-Z]/.test(contraseña)) {
        errors.contraseña = 'La contraseña debe tener al menos una mayúscula'
    } else if (!/[0-9]/.test(contraseña)) {
        errors.contraseña = 'La contraseña debe tener al menos un número'
    }

    if (!confirmar_contraseña) {
        errors.confirmar_contraseña = 'Debes confirmar la contraseña'
    } else if (contraseña !== confirmar_contraseña) {
        errors.confirmar_contraseña = 'Las contraseñas no coinciden'
    }

    return errors
}