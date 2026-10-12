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
import { registroService, getCiudadesByDepartamentoService } from '@/app/services/authService'
import { getDepartamentosService } from '@/app/services/catalogs'
import { getEspecialidadesService } from '@/app/services/doctorServices'

export const useRegister = (role, setRole) => {
    const router = useRouter()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [feedback, setFeedback] = useState({kind:'idle',message:'',revision:0})
    const report = (kind,message) => setFeedback(prev => ({kind,message,revision:prev.revision+1}))

    const [procesoId, setProcesoId] = useState('')
    const [comparaciones, setComparaciones] = useState(null)
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
        genero: '',
        tipo_sangre: '',
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
        {
            if (procesoId && ['nombre', 'apellido', 'tipo_documento', 'numero_documento', 'fecha_nacimiento'].includes(name)) return
            if (correoConfigurado) return
            if (['telefono','estatura','peso','genero','tipo_sangre','direccion','departamento_filtro','id_ciudad','id_especialidad','hoja_vida'].includes(name)) {setDatosGuardados(false)}
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
        report('error', Object.values(validationErrors)[0] + '. Revisa el campo indicado.')
        return true
    }

    const ejecutarPaso = async (accion, message = "Verificando y guardando tus datos…") => {
        if (ocupado.current) return
        ocupado.current = true
        setLoading(true)
        setErrors({})
        report("pending",message)
        try {
            await accion()
            setFeedback(prev => prev.kind === "pending" ? {...prev,kind:"success",message:"Datos confirmados. Puedes continuar."} : prev)
        } catch (error) {
            const errores = error.response?.data?.errores
            setErrors(errores || {})
            setComparaciones(error.response?.data?.data?.comparaciones || null)
            report('error', obtenerPrimerError(errores) || error.response?.data?.mensaje || error.message || 'No fue posible continuar. Reintenta; tus datos se conservan.')
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
        if (ocupado.current || loading) return
        if (step === 2) return handleDocumento()
        if (step === 1) {
            if (mostrarValidacion(validateRegisterStep1(form, role))) return
            return ejecutarPaso(async () => {
                if (!procesoId) {
                    const { nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento } = form
                    const response = await registroService(role, '', {nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento})
                    const id = response.data?.proceso_id
                    if (!id) throw new Error('La API no devolvió el proceso de registro')
                    setProcesoId(id)
                }
                setStep(2)
            })
        }
        if (step !== 3 || !procesoId || !documentoVerificado) return
        if (mostrarValidacion(role === 'paciente' ? validateRegisterPacienteStep2(form) : validateRegisterMedicoStep2(form))) return
        return ejecutarPaso(async () => {
            if (!datosGuardados) {
                let datos = {proceso_id:procesoId, telefono:form.telefono,
                    estatura:Number(String(form.estatura).replace(',', '.')), peso:Number(String(form.peso).replace(',', '.')),
                    genero:form.genero, tipo_sangre:form.tipo_sangre}
                if (role === 'medico') {
                    datos = new FormData()
                    for (const [nombre, valor] of Object.entries({proceso_id:procesoId, telefono:form.telefono,
                        direccion:form.direccion, ciudad:form.id_ciudad, id_especialidad:form.id_especialidad, hoja_vida:form.hoja_vida})) datos.append(nombre, valor)
                }
                const response = await registroService(role, role === 'medico' ? 'datos-profesionales' : 'datos-adicionales', datos)
                if (response.data?.datos_guardados !== true) throw new Error('Todavía no se confirmaron los datos')
                setDatosGuardados(true)
            }
            setStep(4)
        }, role === 'medico' ? 'Guardando tus datos profesionales y hoja de vida…' : 'Guardando tus datos adicionales…')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (ocupado.current || loading) return
        if (step < 4) return handleNextStep()
        if (step === 5) return handleVerificarOtp()
        if (!procesoId || !documentoVerificado || !datosGuardados) return
        if (correoConfigurado) return setStep(5)
        if (mostrarValidacion(validateRegisterStep3(form))) return
        return ejecutarPaso(async () => {
            const response = await registroService(role, 'credenciales', {proceso_id:procesoId, correo:form.correo, contraseña:form.contraseña})
            if (response.data?.correo_configurado !== true) throw new Error('No se confirmó el envío del código')
            setCorreoConfigurado(true)
            setStep(5)
        }, 'Preparando tu correo y enviando el código…')
    }

    const handleVerificarOtp = async () => {
        if (step !== 5 || !procesoId || !documentoVerificado || !datosGuardados || !correoConfigurado) return
        if (!correoVerificado && mostrarValidacion(validateRegisterOtp(otp))) return
        return ejecutarPaso(async () => {
            if (!correoVerificado) {
                const response = await registroService(role, 'verificar-correo', { proceso_id: procesoId, codigo: otp.trim() })
                if (response.data?.correo_verificado !== true) throw new Error('El correo todavía no está verificado')
                setCorreoVerificado(true)
                report("pending","Correo confirmado. Completando tu registro…")
            }
            await registroService(role, 'completar', { proceso_id: procesoId })
            report("success",role === "medico" ? "Solicitud recibida. Tu perfil requiere aprobación profesional." : "Registro completado. Tu identidad y correo están verificados.")
            await Swal.fire({ icon: 'success', title: '¡Registro exitoso!', text: role === 'medico' ? `${form.nombre}, tu identidad y correo están verificados. Tu solicitud profesional está pendiente de aprobación.` : `Bienvenido ${form.nombre}, tu registro está completo.`, confirmButtonText: 'Aceptar' })
            router.push('/login')
        }, correoVerificado ? 'Completando tu registro…' : 'Verificando el código de tu correo…')
    }

    const handleDocumento = async () => {
        if (step !== 2 || !procesoId) return
        if (documentoVerificado) return setStep(3)
        if (mostrarValidacion(validateRegisterDocumento(form.tipo_documento, documentoFrente, documentoReverso))) return
        return ejecutarPaso(async () => {
            if (!documentoCargado) {
                const formData = new FormData()
                formData.append('proceso_id', procesoId)
                formData.append('documento_frente', documentoFrente)
                if (form.tipo_documento === 'CC') formData.append('documento_reverso', documentoReverso)
                await registroService(role, 'subir-documento', formData)
                setDocumentoCargado(true)
            }
            const response = await registroService(role, 'documento/verificar', { proceso_id: procesoId })
            if (response.data?.documento_verificado !== true) throw new Error('La identidad todavía no está verificada')
            setDocumentoVerificado(true)
            setComparaciones(response.data?.comparaciones || null)
            report("success","Los datos del documento coinciden. Continúa con el siguiente paso.")
            setStep(3)
        }, "Verificando tu documento de identidad…")
    }

    const handleArchivoDocumento = (cara, archivo) => {
        if (ocupado.current || documentoVerificado) return
        if (cara === 'frente') setDocumentoFrente(archivo)
        else setDocumentoReverso(archivo)
        setDocumentoCargado(false)
        setComparaciones(null)
        setErrors({})
    }

    const handleReenviarOtp = () => {
        if (step !== 5 || !correoConfigurado || correoVerificado) return
        return ejecutarPaso(async () => {
            await registroService(role, 'reenviar-codigo', { proceso_id: procesoId })
            report('success','Código reenviado. Revisa tu correo e ingresa el nuevo código.')
        })
    }
    return {
        form,
        feedback,
        step,
        comparaciones,
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
