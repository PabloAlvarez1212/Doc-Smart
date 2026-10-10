export const validateRegisterStep1 = ({ nombre, apellido, cedula, tipo_documento, numero_documento, fecha_nacimiento }, role) => {
    const errors = {}

    if (!nombre) errors.nombre = 'El nombre es requerido'
    else if (nombre.length < 2) errors.nombre = 'El nombre debe tener mínimo 2 caracteres'

    if (!apellido) errors.apellido = 'El apellido es requerido'
    else if (apellido.length < 2) errors.apellido = 'El apellido debe tener mínimo 2 caracteres'

    if (!['CC','TI','PASAPORTE','RC'].includes(tipo_documento)) errors.tipo_documento = 'Selecciona un tipo de documento válido'
    if (!numero_documento) errors.numero_documento = 'El número de documento es requerido'
    else if (tipo_documento !== 'PASAPORTE' && !/^\d+$/.test(numero_documento)) errors.numero_documento = 'El documento debe contener solo números'
    else if (tipo_documento === 'PASAPORTE' && !/^[A-Za-z0-9]+$/.test(numero_documento)) errors.numero_documento = 'El pasaporte debe contener letras y números'
    else if (numero_documento.length < 5 || numero_documento.length > 30) errors.numero_documento = 'El documento debe tener entre 5 y 30 caracteres'

    if (!fecha_nacimiento) {
        errors.fecha_nacimiento = 'La fecha de nacimiento es requerida'
    } else {
        const fecha = new Date(`${fecha_nacimiento}T00:00:00`)
        const hoy = new Date()
        const edad = hoy.getFullYear() - fecha.getFullYear() - (hoy.getMonth() < fecha.getMonth() || (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate()) ? 1 : 0)
        if (Number.isNaN(fecha.getTime())) errors.fecha_nacimiento = 'La fecha no es válida'
        else if (role === 'medico' && edad < 18) errors.fecha_nacimiento = 'El registro médico requiere ser mayor de 18 años'
        else if (fecha > hoy) errors.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura'
        else if (edad < 1 || edad > 120) errors.fecha_nacimiento = 'La fecha de nacimiento no es válida'
    }

    return errors
}

export const validateRegisterPacienteStep2 = ({ telefono, estatura, peso, genero, tipo_sangre }) => {
    const errors = {}

    if (!telefono) errors.telefono = 'El teléfono es requerido'
    else if (!/^\d+$/.test(telefono)) errors.telefono = 'El teléfono debe contener solo números'
    else if (!/^3\d{9}$/.test(telefono)) errors.telefono = 'El celular debe tener 10 dígitos y comenzar por 3'

    if (!estatura) {
        errors.estatura = 'La estatura es requerida'
    } else {
        const estaturaNum = Number(String(estatura).replace(',', '.'))
        if (isNaN(estaturaNum) || estaturaNum < 0.5 || estaturaNum > 2.5)
            errors.estatura = 'La estatura debe estar entre 0.5 y 2.5 metros'
    }

    if (!peso) {
        errors.peso = 'El peso es requerido'
    } else {
        const pesoNum = Number(String(peso).replace(',', '.'))
        if (isNaN(pesoNum) || pesoNum < 1 || pesoNum > 500)
            errors.peso = 'El peso debe estar entre 1 y 500 kg'
    }

    const generosPermitidos = ['M', 'F', 'OTRO', 'PREFIERO_NO_DECIR']
    if (!genero) errors.genero = 'El género es requerido'
    else if (!generosPermitidos.includes(genero))
        errors.genero = 'El género seleccionado no es válido'

    const tiposSangrePermitidos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    if (!tipo_sangre) errors.tipo_sangre = 'El tipo de sangre es requerido'
    else if (!tiposSangrePermitidos.includes(tipo_sangre))
        errors.tipo_sangre = 'El tipo de sangre seleccionado no es válido'

    return errors
}

export const validateRegisterMedicoStep2 = ({ telefono, direccion, departamento_filtro, id_ciudad, id_especialidad, hoja_vida }) => {
    const errors = {}

    if (!telefono) errors.telefono = 'El teléfono es requerido'
    else if (!/^\d+$/.test(telefono)) errors.telefono = 'El teléfono debe contener solo números'

    if (!/^3\d{9}$/.test(telefono)) errors.telefono = 'El celular debe tener 10 dígitos y comenzar por 3'
    if (!direccion || direccion.trim().length < 5 || direccion.length > 255) errors.direccion = 'Ingresa una dirección de entre 5 y 255 caracteres'
    if (!hoja_vida) errors.hoja_vida = 'Adjunta tu hoja de vida en PDF'
    else if (hoja_vida.type !== 'application/pdf' || !/\.pdf$/i.test(hoja_vida.name) || !hoja_vida.size || hoja_vida.size > 5 * 1024 * 1024) errors.hoja_vida = 'Selecciona un PDF válido de hasta 5 MB'
    if (!departamento_filtro) errors.departamento_filtro = 'El departamento es requerido'
    if (!id_ciudad) errors.id_ciudad = 'La ciudad es requerida'
    if (!id_especialidad) errors.id_especialidad = 'La especialidad es requerida'

    return errors
}

export const validateRegisterStep3 = ({ correo, contraseña, confirmar_contraseña }) => {
    const errors = {}

    if (!correo) errors.correo = 'El correo es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
        errors.correo = 'El correo no tiene un formato válido'

    if (!contraseña) errors.contraseña = 'La contraseña es requerida'
    else if (contraseña.length < 8) errors.contraseña = 'La contraseña debe tener mínimo 8 caracteres'
    else if (!/[A-Z]/.test(contraseña)) errors.contraseña = 'La contraseña debe tener al menos una mayúscula'
    else if (!/[a-z]/.test(contraseña)) errors.contraseña = 'La contraseña debe tener al menos una minúscula'
    else if (!/[^a-zA-Z0-9]/.test(contraseña)) errors.contraseña = 'La contraseña debe tener al menos un carácter especial'
    else if (/[<>\\"'&]/.test(contraseña)) errors.contraseña = 'No se permiten <, >, comillas, barra invertida o & en la contraseña'
    else if (new TextEncoder().encode(contraseña).length > 72) errors.contraseña = 'La contraseña es demasiado larga (máximo 72 bytes)'
    else if (!/[0-9]/.test(contraseña)) errors.contraseña = 'La contraseña debe tener al menos un número'

    if (!confirmar_contraseña) errors.confirmar_contraseña = 'Debes confirmar la contraseña'
    else if (contraseña !== confirmar_contraseña) errors.confirmar_contraseña = 'Las contraseñas no coinciden'

    return errors
}

export const validateRegisterDocumento = (tipo, frente, reverso) => {
    const errors = {}
    if (!frente || (tipo === 'CC' && !reverso)) errors.documento = tipo === 'CC' ? 'Debes cargar frente y reverso del documento.' : 'Debes cargar el documento.'
    for (const archivo of [frente, tipo === 'CC' ? reverso : null].filter(Boolean)) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) errors.documento = 'Solo se permiten JPG, PNG o WEBP.'
        else if (!archivo.size || archivo.size > 8 * 1024 * 1024) errors.documento = 'Cada imagen debe contener datos y no superar 8 MB.'
    }
    return errors
}

export const validateRegisterOtp = (otp) => /^\d{6}$/.test(otp.trim()) ? {} : { codigo: 'Ingresa el código de 6 dígitos enviado a tu correo.' }
