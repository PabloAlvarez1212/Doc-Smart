'use client'
import { obtenerPrimerError } from '@/app/utils/errrorUtils'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import {
    validateRegisterStep1,
    validateRegisterPacienteStep2,
    validateRegisterMedicoStep2,
    validateRegisterStep3,
    validateRegisterDocumento,
    validateRegisterOtp,
} from '@/app/validations/registerValidate'
import {
    iniciarRegistroPacienteService,
    guardarDatosAdicionalesRegistroService,
    configurarCredencialesRegistroService,
    reenviarCodigoRegistroService,
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
    const [documentoVerificado, setDocumentoVerificado] = useState(false)
    const [documentoCargado, setDocumentoCargado] = useState(false)
    const [datosGuardados, setDatosGuardados] = useState(false)
    const [correoConfigurado, setCorreoConfigurado] = useState(false)
    const [correoVerificado, setCorreoVerificado] = useState(false)
    const ocupado = useRef(false)

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
        if (loading) return
        if (role === 'paciente') {
            if (procesoId && ['nombre', 'apellido', 'tipo_documento', 'numero_documento', 'fecha_nacimiento'].includes(name)) return
            if (correoConfigurado) return
            if (['telefono', 'estatura', 'peso'].includes(name)) setDatosGuardados(false)
        }

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

    const mostrarValidacion = (validationErrors) => {
        setErrors(validationErrors)
        if (!Object.keys(validationErrors).length) return false
        Swal.fire({ icon: 'error', title: 'Campos inválidos', text: Object.values(validationErrors)[0] })
        return true
    }

    const ejecutarPaso = async (accion) => {
        if (ocupado.current) return
        ocupado.current = true
        setLoading(true)
        try {
            await accion()
        } catch (error) {
            const errores = error.response?.data?.errores
            setErrors(errores || {})
            Swal.fire({ icon: 'error', title: 'No fue posible continuar', text: obtenerPrimerError(errores) || error.response?.data?.mensaje || error.message || 'Intenta nuevamente.' })
        } finally {
            ocupado.current = false
            setLoading(false)
        }
    }

    const handleBack = () => {
        if (ocupado.current || loading) return
        setErrors({})
        if (step === 1) setRole(null)
        else setStep((prev) => prev - 1)
    }

    const handleNextStep = async () => {
        if (loading) return
        if (role === 'paciente') {
            if (step === 2) return handleDocumento()
            if (step === 1) {
                if (mostrarValidacion(validateRegisterStep1(form, role))) return
                return ejecutarPaso(async () => {
                    if (!procesoId) {
                        const { nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento } = form
                        const response = await iniciarRegistroPacienteService({ nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento })
                        const id = response.data?.proceso_id || response.proceso_id
                        if (!id) throw new Error('La API no devolvió el proceso de registro')
                        setProcesoId(id)
                    }
                    setStep(2)
                })
            }
            if (step !== 3 || !procesoId || !documentoVerificado) return
            if (mostrarValidacion(validateRegisterPacienteStep2(form))) return
            return ejecutarPaso(async () => {
                if (!datosGuardados) {
                    await guardarDatosAdicionalesRegistroService({ proceso_id: procesoId, telefono: form.telefono,
                        estatura: Number(String(form.estatura).replace(',', '.')), peso: Number(String(form.peso).replace(',', '.')) })
                    setDatosGuardados(true)
                }
                setStep(4)
            })
        }
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
        if (loading) return
        if (role === 'paciente') {
            if (step < 4) return handleNextStep()
            if (step === 5) return handleVerificarOtp()
            if (!procesoId || !documentoVerificado || !datosGuardados) return
            if (correoConfigurado) return setStep(5)
            if (mostrarValidacion(validateRegisterStep3(form))) return
            return ejecutarPaso(async () => {
                await configurarCredencialesRegistroService({ proceso_id: procesoId, correo: form.correo, contraseña: form.contraseña })
                setCorreoConfigurado(true)
                setStep(5)
            })
        }

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
        if (role !== 'paciente' || step !== 5 || !procesoId || !documentoVerificado || !datosGuardados || !correoConfigurado) return
        if (!correoVerificado && mostrarValidacion(validateRegisterOtp(otp))) return
        return ejecutarPaso(async () => {
            if (!correoVerificado) {
                const response = await verificarCorreoRegistroService({ proceso_id: procesoId, codigo: otp.trim() })
                if (response.data?.correo_verificado !== true) throw new Error('El correo todavía no está verificado')
                setCorreoVerificado(true)
            }
            await completarRegistroPacienteService({ proceso_id: procesoId })
            await Swal.fire({ icon: 'success', title: '¡Registro exitoso!', text: `Bienvenido ${form.nombre}, tu registro está completo.`, confirmButtonText: 'Aceptar' })
            router.push('/login')
        })
    }

    const handleDocumento = async () => {
        if (role !== 'paciente' || step !== 2 || !procesoId) return
        if (documentoVerificado) return setStep(3)
        if (mostrarValidacion(validateRegisterDocumento(form.tipo_documento, documentoFrente, documentoReverso))) return
        return ejecutarPaso(async () => {
            if (!documentoCargado) {
                const formData = new FormData()
                formData.append('proceso_id', procesoId)
                formData.append('documento_frente', documentoFrente)
                if (form.tipo_documento === 'CC') formData.append('documento_reverso', documentoReverso)
                await subirDocumentoRegistroService(formData)
                setDocumentoCargado(true)
            }
            const response = await verificarDocumentoRegistroService({ proceso_id: procesoId })
            if (response.data?.documento_verificado !== true) throw new Error('La identidad todavía no está verificada')
            setDocumentoVerificado(true)
            setStep(3)
        })
    }

    const handleArchivoDocumento = (cara, archivo) => {
        if (ocupado.current || documentoVerificado) return
        if (cara === 'frente') setDocumentoFrente(archivo)
        else setDocumentoReverso(archivo)
        setDocumentoCargado(false)
        setErrors({})
    }

    const handleReenviarOtp = () => {
        if (step !== 5 || !correoConfigurado || correoVerificado) return
        return ejecutarPaso(async () => {
            await reenviarCodigoRegistroService({ proceso_id: procesoId })
            setOtp('')
            await Swal.fire({ icon: 'success', title: 'Código reenviado', text: 'Revisa tu correo.' })
        })
    }
    return {
        form,
        step,
        setStep: role === 'medico' ? setStep : undefined,
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
        setDocumentoFrente: (archivo) => handleArchivoDocumento('frente', archivo),
        documentoReverso,
        setDocumentoReverso: (archivo) => handleArchivoDocumento('reverso', archivo),
        handleVerificarOtp,
        handleDocumento,
        handleBack,
        handleReenviarOtp,
        documentoVerificado,
        correoConfigurado,
        correoVerificado,
    }
}
