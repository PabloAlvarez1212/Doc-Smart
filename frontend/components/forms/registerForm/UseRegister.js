'use client'
import { obtenerPrimerError } from '@/app/utils/errrorUtils'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import {
    validateRegisterStep1,
    validateRegisterPacienteStep2,
    validateRegisterMedicoStep2,
    validateRegisterStep3,
} from '@/app/validations/registerValidate'
import {
    registerPacienteService,
    registerMedicoService,
    getCiudadesByDepartamentoService,
} from '@/app/services/authService'
import { getDepartamentosService } from '@/app/services/catalogs'
import { getEspecialidadesService } from '@/app/services/doctorServices'
// Hook personalizado que centraliza toda la lógica del formulario de registro
export const useRegister = (role, setRole) => {
    const router = useRouter()

    const [step, setStep] = useState(1)           // Paso actual del formulario (1, 2 o 3)
    const [loading, setLoading] = useState(false) // Controla el estado de carga al enviar
    const [errors, setErrors] = useState({})      // Errores de validación por campo

    // Listas de opciones para los selects del formulario de médico
    const [especialidades, setEspecialidades] = useState([])
    const [departamentos, setDepartamentos] = useState([])
    const [ciudades, setCiudades] = useState([])

    // Estado unificado del formulario para ambos roles
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        cedula: '',
        fecha_nacimiento: '',
        telefono: '',
        direccion: '',
        departamento_filtro: '', // Solo para filtrar ciudades, no se envía a la BD
        id_ciudad: '',
        id_especialidad: '',
        correo: '',
        contraseña: '',
        confirmar_contraseña: '',
        estatura: '',            // Solo paciente
        peso: '',                // Solo paciente
        hoja_vida: null
    })

    // Carga especialidades y departamentos cuando el rol es médico
    useEffect(() => {
        if (role === 'medico') {
            getEspecialidadesService()
                .then((data) => setEspecialidades(data.data))
                .catch(() => setEspecialidades([]))

            getDepartamentosService()
                .then((data) => setDepartamentos(data.data))
                .catch(() => setDepartamentos([]))
        }
    }, [role])

    // Actualiza las ciudades disponibles cada vez que cambia el departamento seleccionado
    useEffect(() => {
        if (form.departamento_filtro) {
            getCiudadesByDepartamentoService(form.departamento_filtro)
                .then((data) => setCiudades(data.data))
                .catch(() => setCiudades([]))
        } else {
            // Si no hay departamento seleccionado, limpia el listado de ciudades
            setCiudades([])
        }
    }, [form.departamento_filtro])

    // Actualiza el campo modificado en el formulario y limpia su error
    const handleChange = (e) => {
        const { name, value, files } = e.target

        if (name === "hoja_vida") {
            setForm((prev) => ({
                ...prev,
                hoja_vida: files?.[0] ?? null,
            }))

            setErrors((prev) => ({
                ...prev,
                hoja_vida: "",
            }))

            return
        }

        if (name === "departamento_filtro") {
            setForm((prev) => ({
                ...prev,
                departamento_filtro: value,
                id_ciudad: "",
            }))
        } else {
            setForm((prev) => ({
                ...prev,
                [name]: value,
            }))
        }

        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }))
    }

    // Valida el paso actual y avanza al siguiente si no hay errores
    const handleNextStep = () => {
        let validationErrors = {}

        if (step === 1) {
            validationErrors = validateRegisterStep1(form)
        } else if (step === 2) {
            // Valida campos diferentes según el rol
            validationErrors = role === 'paciente'
                ? validateRegisterPacienteStep2(form)
                : validateRegisterMedicoStep2(form)
        }

        if (Object.keys(validationErrors).length > 0) {
            // Muestra el primer error encontrado en un modal
            Swal.fire({
                icon: 'error',
                title: 'Campos inválidos',
                text: Object.values(validationErrors)[0],
            })
            setErrors(validationErrors)
            return
        }

        setStep((prev) => prev + 1)
    }

    // Valida el paso 3 y envía el formulario según el rol
    const handleSubmit = async (e) => {
        e.preventDefault()

        const validationErrors = validateRegisterStep3(form)
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
                // Construye el payload del paciente convirtiendo estatura y peso a float
                const payload = {
                    nombre: form.nombre,
                    apellido: form.apellido,
                    correo: form.correo,
                    contraseña: form.contraseña,
                    fecha_nacimiento: form.fecha_nacimiento,
                    estatura: parseFloat(String(form.estatura).replace(',', '.')), // Acepta coma o punto decimal
                    peso: parseFloat(String(form.peso).replace(',', '.')),
                    cedula: form.cedula,
                    telefono: form.telefono,
                }
                await registerPacienteService(payload)
            } else {
                const formData = new FormData()

                formData.append("nombre", form.nombre)
                formData.append("apellido", form.apellido)
                formData.append("correo", form.correo)
                formData.append("contraseña", form.contraseña)
                formData.append("cedula", form.cedula)
                formData.append("fecha_nacimiento", form.fecha_nacimiento)
                formData.append("telefono", form.telefono)
                formData.append("direccion", form.direccion)
                formData.append("ciudad", String(form.id_ciudad))
                formData.append("id_especialidad", String(form.id_especialidad))

                if (form.hoja_vida) {
                    formData.append("hoja_vida", form.hoja_vida)
                }

                await registerMedicoService(formData)
            }

            // Registro exitoso: notifica al usuario y redirige al login
            await Swal.fire({
                icon: 'success',
                title: role === 'medico'
                    ? '¡Solicitud enviada!'
                    : '¡Registro exitoso!',
                text: role === 'medico'
                    ? `${form.nombre}, hemos recibido tu solicitud y hoja de vida. Nuestro equipo revisará tu información y, si tu perfil continúa en el proceso, nos pondremos en contacto contigo para coordinar una entrevista.`
                    : `Bienvenido ${form.nombre}, tu cuenta ha sido creada correctamente.`,
                confirmButtonText: 'Aceptar',
            })

            router.push('/login')

        } catch (error) {
            // Extrae el primer mensaje de error devuelto por la API
            console.log('error completo:', JSON.stringify(error.response?.data))
            const errores = error.response?.data?.errores;
            let mensaje = error.response?.data?.mensaje || 'Error al conectar con el servidor';
            const errorExtraido = obtenerPrimerError(errores);
            if (errorExtraido) {
                mensaje = errorExtraido;
            }
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: mensaje,
            })

            // Propaga los errores al formulario para resaltar los campos inválidos
            if (errores) setErrors(errores)
        } finally {
            // Siempre desactiva el estado de carga al finalizar
            setLoading(false)
        }
    }

    return {
        form,
        step,
        setStep,
        loading,
        errors,
        especialidades,
        departamentos,
        ciudades,
        handleChange,
        handleNextStep,
        handleSubmit,
        setRole,
    }
}