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
    iniciarRegistroPacienteService,
    verificarCorreoRegistroService,
    subirDocumentoRegistroService,
    verificarDocumentoRegistroService,
    completarRegistroPacienteService,
    registerMedicoService,
    getCiudadesByDepartamentoService,
} from '@/app/services/authService'
import { getDepartamentosService } from '@/app/services/catalogs'
import { getEspecialidadesService } from '@/app/services/doctorServices'

export const useRegister = (role, setRole) => {
    const router = useRouter()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const [procesoId, setProcesoId] = useState('')
    const [otp, setOtp] = useState('')
    const [documentoFrente, setDocumentoFrente] = useState(null)
    const [documentoReverso, setDocumentoReverso] = useState(null)

    const [especialidades, setEspecialidades] = useState([])
    const [departamentos, setDepartamentos] = useState([])
    const [ciudades, setCiudades] = useState([])

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        cedula: '',
        tipo_documento: 'CC',
        numero_documento: '',
        fecha_nacimiento: '',
        telefono: '',
        direccion: '',
        departamento_filtro: '',
        id_ciudad: '',
        id_especialidad: '',
        correo: '',
        contraseña: '',
        confirmar_contraseña: '',
        estatura: '',
        peso: '',
        hoja_vida: null
    })

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

    useEffect(() => {
        if (form.departamento_filtro) {
            getCiudadesByDepartamentoService(form.departamento_filtro)
                .then((data) => setCiudades(data.data))
                .catch(() => setCiudades([]))
        } else {
            setCiudades([])
        }
    }, [form.departamento_filtro])

    const handleChange = (e) => {
        const { name, value, files } = e.target

        if (name === 'hoja_vida') {
            setForm((prev) => ({ ...prev, hoja_vida: files?.[0] ?? null }))
            setErrors((prev) => ({ ...prev, hoja_vida: '' }))
            return
        }

        if (name === 'departamento_filtro') {
            setForm((prev) => ({ ...prev, departamento_filtro: value, id_ciudad: '' }))
        } else {
            setForm((prev) => ({ ...prev, [name]: value }))
        }

        setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    const handleNextStep = () => {
        let validationErrors = {}

        if (step === 1) {
            validationErrors = validateRegisterStep1(form, role)
        } else if (step === 2) {
            validationErrors = role === 'paciente'
                ? validateRegisterPacienteStep2(form)
                : validateRegisterMedicoStep2(form)
        }

        if (Object.keys(validationErrors).length > 0) {
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
                const payload = {
                    nombre: form.nombre,
                    apellido: form.apellido,
                    tipo_documento: form.tipo_documento,
                    numero_documento: form.numero_documento,
                    fecha_nacimiento: form.fecha_nacimiento,
                    correo: form.correo,
                    contraseña: form.contraseña,
                    telefono: form.telefono,
                    estatura: parseFloat(String(form.estatura).replace(',', '.')),
                    peso: parseFloat(String(form.peso).replace(',', '.')),
                }

                const response = await iniciarRegistroPacienteService(payload)
                const id = response.data?.proceso_id || response.proceso_id

                if (!id) throw new Error('La API no devolvió el proceso de registro')

                setProcesoId(id)
                setStep(4)
                return
            }

            const formData = new FormData()

            formData.append('nombre', form.nombre)
            formData.append('apellido', form.apellido)
            formData.append('correo', form.correo)
            formData.append('contraseña', form.contraseña)
            formData.append('cedula', form.cedula)
            formData.append('fecha_nacimiento', form.fecha_nacimiento)
            formData.append('telefono', form.telefono)
            formData.append('direccion', form.direccion)
            formData.append('ciudad', String(form.id_ciudad))
            formData.append('id_especialidad', String(form.id_especialidad))

            if (form.hoja_vida) formData.append('hoja_vida', form.hoja_vida)

            await registerMedicoService(formData)

            await Swal.fire({
                icon: 'success',
                title: '¡Solicitud enviada!',
                text: `${form.nombre}, hemos recibido tu solicitud y hoja de vida. Nuestro equipo revisará tu información y, si tu perfil continúa en el proceso, nos pondremos en contacto contigo para coordinar una entrevista.`,
                confirmButtonText: 'Aceptar',
            })

            router.push('/login')

        } catch (error) {
            console.log('error completo:', JSON.stringify(error.response?.data))

            const errores = error.response?.data?.errores
            let mensaje =
                error.response?.data?.mensaje ||
                error.message ||
                'Error al conectar con el servidor'

            const errorExtraido = obtenerPrimerError(errores)
            if (errorExtraido) mensaje = errorExtraido

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: mensaje,
            })

            if (errores) setErrors(errores)
        } finally {
            setLoading(false)
        }
    }

    const handleVerificarOtp = async () => {
        if (!otp.trim()) {
            Swal.fire({
                icon: 'error',
                title: 'Código requerido',
                text: 'Ingresa el código enviado a tu correo.',
            })
            return
        }

        setLoading(true)

        try {
            await verificarCorreoRegistroService({
                proceso_id: procesoId,
                codigo: otp.trim(),
            })

            setStep(5)

        } catch (error) {
            const errores = error.response?.data?.errores

            Swal.fire({
                icon: 'error',
                title: 'Código inválido',
                text:
                    obtenerPrimerError(errores) ||
                    error.response?.data?.mensaje ||
                    'No fue posible verificar el código',
            })

        } finally {
            setLoading(false)
        }
    }

    const handleDocumento = async () => {
        if (!documentoFrente || (form.tipo_documento === 'CC' && !documentoReverso)) {
            Swal.fire({
                icon: 'error',
                title: 'Documento incompleto',
                text: form.tipo_documento === 'CC'
                    ? 'Debes cargar frente y reverso del documento.'
                    : 'Debes cargar el documento.',
            })
            return
        }

        setLoading(true)

        try {
            const formData = new FormData()

            formData.append('proceso_id', procesoId)
            formData.append('documento_frente', documentoFrente)

            if (documentoReverso) {
                formData.append('documento_reverso', documentoReverso)
            }

            await subirDocumentoRegistroService(formData)

            await verificarDocumentoRegistroService({
                proceso_id: procesoId,
            })

            await completarRegistroPacienteService({
                proceso_id: procesoId,
            })

            await Swal.fire({
                icon: 'success',
                title: '¡Registro exitoso!',
                text: `Bienvenido ${form.nombre}, tu identidad fue verificada correctamente.`,
                confirmButtonText: 'Aceptar',
            })

            router.push('/login')

        } catch (error) {
            console.log('error documento:', JSON.stringify(error.response?.data))

            const errores = error.response?.data?.errores

            Swal.fire({
                icon: 'error',
                title: 'No fue posible verificar tu identidad',
                text:
                    obtenerPrimerError(errores) ||
                    error.response?.data?.mensaje ||
                    'Intenta nuevamente.',
            })

        } finally {
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
        procesoId,
        otp,
        setOtp,
        documentoFrente,
        setDocumentoFrente,
        documentoReverso,
        setDocumentoReverso,
        handleVerificarOtp,
        handleDocumento,
    }
}