'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import {
    validateRegisterStep1,
    validateRegisterPacienteStep2,
    validateRegisterMedicoStep2,
} from '@/app/validations/registerValidate'
import {
    registerPacienteService,
    registerMedicoService,
    getEspecialidadesService,
} from '@/app/services/authService'

export const useRegister = (role, setRole) => {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [especialidades, setEspecialidades] = useState([])

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        correo: '',
        contraseña: '',
        fecha_nacimiento: '',
        estatura: '',
        peso: '',
        cedula: '',
        telefono: '',
        id_especialidad: '',
        direccion: '',
        ciudad: '',
    })

    useEffect(() => {
        if (role === 'medico') {
            getEspecialidadesService()
                .then((data) => setEspecialidades(data.data || data))
                .catch(() => setEspecialidades([]))
        }
    }, [role])

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setErrors({ ...errors, [e.target.name]: '' })
    }

    const handleNextStep = () => {
        const validationErrors = validateRegisterStep1(form)
        if (Object.keys(validationErrors).length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Campos inválidos',
                text: Object.values(validationErrors)[0],
            })
            setErrors(validationErrors)
            return
        }
        setStep(2)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validación del paso 2 según rol
        const validationErrors = role === 'paciente'
            ? validateRegisterPacienteStep2(form)
            : validateRegisterMedicoStep2(form)

        if (Object.keys(validationErrors).length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Campos inválidos',
                text: Object.values(validationErrors)[0],
            })
            setErrors(validationErrors)
            return
        }

        setLoading(true)

        try {
            if (role === 'paciente') {
                const payload = {
                    nombre: form.nombre,
                    apellido: form.apellido,
                    correo: form.correo,
                    contraseña: form.contraseña,
                    fecha_nacimiento: form.fecha_nacimiento,
                    estatura: parseFloat(String(form.estatura).replace(',', '.')),
                    peso: parseFloat(String(form.peso).replace(',', '.')),
                    cedula: form.cedula,
                    telefono: form.telefono,
                }
                await registerPacienteService(payload)
            } else {
                const payload = {
                    nombre: form.nombre,
                    apellido: form.apellido,
                    correo: form.correo,
                    contraseña: form.contraseña,
                    cedula: form.cedula,
                    fecha_nacimiento: form.fecha_nacimiento,
                    telefono: form.telefono,
                    id_especialidad: parseInt(form.id_especialidad),
                    direccion: form.direccion,
                    ciudad: form.ciudad || null,
                }
                await registerMedicoService(payload)
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Registro exitoso!',
                text: `Bienvenido ${form.nombre}, tu cuenta ha sido creada correctamente.`,
            })

            router.push('/login')

        } catch (error) {
            const errores = error.response?.data?.errores

            let mensaje = 'Error en el servidor'
            if (errores && Object.keys(errores).length > 0) {
                mensaje = Object.values(errores)[0]
                if (Array.isArray(mensaje)) mensaje = mensaje[0]
            }

            Swal.fire({
                icon: 'error',
                title: 'Error al registrarse',
                text: mensaje,
            })

            if (errores) setErrors(errores)
        } finally {
            setLoading(false)
        }
    }

    return {
        form,
        step,
        loading,
        errors,
        especialidades,
        handleChange,
        handleNextStep,
        handleSubmit,
        setRole,
    }
}