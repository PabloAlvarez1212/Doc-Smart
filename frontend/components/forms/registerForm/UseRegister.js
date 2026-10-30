'use client'
import { obtenerPrimerError } from '@/app/utils/errrorUtils'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
    const searchParams = useSearchParams()
    const reanudado = useRef(false)

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [feedback, setFeedback] = useState({kind:'idle',message:'',revision:0})
    const report = (kind,message) => setFeedback(prev => ({kind,message,revision:prev.revision+1}))

    const [procesoId, setProcesoId] = useState('')
    // Lo guardado en el servidor: permite saber si la persona corrigió algo antes de verificar.
    const [datosPaso1, setDatosPaso1] = useState(null)
    const [credencialesEnviadas, setCredencialesEnviadas] = useState(null)
    const [erroresDocumento, setErroresDocumento] = useState({})
    const [otp, setOtp] = useState('')
    const [documentoFrente, setDocumentoFrente] = useState(null)
    const [documentoReverso, setDocumentoReverso] = useState(null)
    const [documentoVerificado, setDocumentoVerificado] = useState(false)
    const [documentoCargado, setDocumentoCargado] = useState(false)
    const [facialListo, setFacialListo] = useState(false)
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
            if (documentoVerificado && ['nombre', 'apellido', 'tipo_documento', 'numero_documento', 'fecha_nacimiento'].includes(name)) return
            if (correoVerificado) return
            if (['telefono','estatura','peso','genero','tipo_sangre','departamento_filtro','id_ciudad','id_especialidad','hoja_vida'].includes(name)) {setDatosGuardados(false)}
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
            report('error', obtenerPrimerError(errores) || error.response?.data?.mensaje || error.message || 'No fue posible continuar. Reintenta; tus datos se conservan.')
        } finally {
            ocupado.current = false
            setLoading(false)
        }
    }

    // Enlace del correo de aprobación: retoma el registro en el paso siguiente a la verificación facial.
    useEffect(() => {
        const id = searchParams.get('reanudar')
        const token = searchParams.get('token')
        if (!id || !token || reanudado.current) return
        reanudado.current = true
        window.history.replaceState(null, '', `${window.location.pathname}?role=${role}`)
        ejecutarPaso(async () => {
            const response = await registroService(role, 'facial/reanudar', { proceso_id: id, token })
            const datos = response.data
            setProcesoId(datos.proceso_id)
            setForm(prev => ({
                ...prev,
                nombre: datos.nombre,
                apellido: datos.apellido,
                tipo_documento: datos.tipo_documento,
                numero_documento: datos.numero_documento,
                fecha_nacimiento: datos.fecha_nacimiento,
            }))
            setDocumentoCargado(true)
            setDocumentoVerificado(true)
            setFacialListo(true)
            setStep(3)
            report('success', 'Tu identidad fue verificada. Completa los datos que faltan para terminar tu registro.')
        }, 'Retomando tu registro…')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleBack = () => {
        if (ocupado.current || loading) return
        setErrors(step === 2 ? erroresDocumento : {})
        if (step === 1) setRole(null)
        else setStep((prev) => prev - 1)
    }

    // Ya existe un registro con estos datos esperando la decisión del administrador.
    const avisarRegistroEnRevision = async (datosPaso1) => {
        const aviso = await Swal.fire({
            icon: 'info',
            title: 'Tu verificación está en revisión',
            text: 'Ya existe un registro con estos datos pendiente de revisión por el equipo de DocSmart. Te avisaremos por correo cuando termine; no necesitas hacer nada más.',
            showDenyButton: true,
            confirmButtonText: 'Entendido',
            denyButtonText: 'Cancelar proceso',
        })
        if (!aviso.isDenied) return
        const confirmacion = await Swal.fire({
            icon: 'warning',
            title: '¿Seguro que deseas cancelar el proceso?',
            text: 'Se eliminará tu registro en revisión y las imágenes cargadas. Si quieres registrarte, tendrás que empezar de nuevo.',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar proceso',
            cancelButtonText: 'No, mantenerlo',
        })
        if (!confirmacion.isConfirmed) return
        try {
            await registroService(role, 'cancelar', datosPaso1)
            await Swal.fire({ icon: 'success', title: 'Proceso cancelado', text: 'Puedes iniciar un registro nuevo cuando quieras.', confirmButtonText: 'Aceptar' })
        } catch (error) {
            await Swal.fire({ icon: 'error', title: 'No se pudo cancelar el proceso', text: obtenerPrimerError(error.response?.data?.errores) || 'Inténtalo de nuevo en unos minutos.', confirmButtonText: 'Aceptar' })
        }
    }

    const datosPaso1Actual = () => {
        const { nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento } = form
        return { nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento }
    }

    const handleNextStep = async () => {
        if (ocupado.current || loading) return
        if (step === 2) return handleDocumento()
        if (step === 1) {
            if (mostrarValidacion(validateRegisterStep1(form, role))) return
            return ejecutarPaso(async () => {
                if (!procesoId) {
                    const { nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento } = form
                    const datosPaso1 = {nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento}
                    let response
                    try {
                        response = await registroService(role, '', datosPaso1)
                    } catch (error) {
                        if (error.response?.status === 409 && error.response.data?.errores?.en_revision) {
                            setFeedback({kind:'idle', message:'', revision:0})
                            await avisarRegistroEnRevision(datosPaso1)
                            return
                        }
                        throw error
                    }
                    const id = response.data?.proceso_id
                    if (!id) throw new Error('La API no devolvió el proceso de registro')
                    setProcesoId(id)
                    setDatosPaso1(datosPaso1)
                    if (response.data?.reanudado) {
                        // Su identidad ya fue verificada: se omiten el documento y el reconocimiento facial.
                        setDocumentoCargado(true)
                        setDocumentoVerificado(true)
                        setFacialListo(true)
                        report('success', 'Tu identidad ya fue verificada. Completa los datos que faltan para terminar tu registro.')
                        setStep(3)
                        return
                    }
                }
                if (procesoId && !documentoVerificado && JSON.stringify(datosPaso1Actual()) !== JSON.stringify(datosPaso1)) {
                    // Corrige lo ya guardado: no hace falta empezar el registro de nuevo.
                    let response
                    try {
                        response = await registroService(role, 'actualizar-datos', { proceso_id: procesoId, ...datosPaso1Actual() })
                    } catch (error) {
                        if (error.response?.status === 409 && error.response.data?.errores?.en_revision) {
                            setFeedback({kind:'idle', message:'', revision:0})
                            await avisarRegistroEnRevision(datosPaso1Actual())
                            return
                        }
                        throw error
                    }
                    if (response.data?.documentos_reiniciados) {
                        // El tipo de documento cambió: las imágenes anteriores ya no sirven.
                        setDocumentoFrente(null)
                        setDocumentoReverso(null)
                        setDocumentoCargado(false)
                    }
                    setErroresDocumento({})
                    setDatosPaso1(datosPaso1Actual())
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
                if (role === "medico") {
                    datos = new FormData();

                    const datosProfesionales = {
                        proceso_id: procesoId,
                        telefono: form.telefono,
                        ciudad: form.id_ciudad,
                        id_especialidad: form.id_especialidad,
                        hoja_vida: form.hoja_vida,
                    };

                    for (const [nombre, valor] of Object.entries(datosProfesionales)) {
                        datos.append(nombre, valor);
                    }
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
        const credenciales = { correo: form.correo.trim().toLowerCase(), contraseña: form.contraseña }
        if (correoConfigurado && JSON.stringify(credenciales) === JSON.stringify(credencialesEnviadas)) return setStep(5)
        if (mostrarValidacion(validateRegisterStep3(form))) return
        return ejecutarPaso(async () => {
            const response = await registroService(role, 'credenciales', {proceso_id:procesoId, correo:form.correo, contraseña:form.contraseña})
            if (response.data?.correo_configurado !== true) throw new Error('No se confirmó el envío del código')
            setCredencialesEnviadas(credenciales)
            setCorreoConfigurado(true)
            if (otp) setOtp('')
            setStep(5)
        }, correoConfigurado ? 'Actualizando tus datos y enviando un nuevo código…' : 'Preparando tu correo y enviando el código…')
    }

    const handleVerificarOtp = async () => {
        if (step !== 5 || !procesoId || !documentoVerificado || !datosGuardados || !correoConfigurado) return
        if (!correoVerificado && mostrarValidacion(validateRegisterOtp(otp))) return
        let recienVerificado = false
        return ejecutarPaso(async () => {
            if (!correoVerificado) {
                const response = await registroService(role, 'verificar-correo', { proceso_id: procesoId, codigo: otp.trim() })
                if (response.data?.correo_verificado !== true) throw new Error('El correo todavía no está verificado')
                setCorreoVerificado(true)
                recienVerificado = true
                report("pending","Correo confirmado. Completando tu registro…")
            }
            // El registro se completa mientras el candado se abre; el aviso final espera a que termine.
            const animacion = recienVerificado ? (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 1700) : 0
            await Promise.all([
                registroService(role, 'completar', { proceso_id: procesoId }),
                new Promise(resolve => setTimeout(resolve, animacion)),
            ])
            report("success",role === "medico" ? "Solicitud recibida. Tu perfil requiere aprobación profesional." : "Registro completado. Tu identidad y correo están verificados.")
            await Swal.fire({ icon: 'success', title: '¡Registro exitoso!', text: role === 'medico' ? `${form.nombre}, tu identidad y correo están verificados. Tu solicitud profesional está pendiente de aprobación.` : `Bienvenido ${form.nombre}, tu registro está completo.`, confirmButtonText: 'Aceptar' })
            router.push('/login')
        }, correoVerificado ? 'Completando tu registro…' : 'Verificando el código de tu correo…')
    }

    const handleDocumento = async () => {
        if (step !== 2 || !procesoId) return
        if (documentoVerificado) return facialListo ? setStep(3) : undefined
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
            let response
            try {
                response = await registroService(role, 'documento/verificar', { proceso_id: procesoId })
            } catch (error) {
                const detalle = error.response?.data?.errores || {}
                setErroresDocumento(Object.fromEntries(['nombre', 'apellido', 'numero_documento', 'fecha_nacimiento'].filter(k => detalle[k]).map(k => [k, detalle[k]])))
                throw error
            }
            if (response.data?.documento_verificado !== true) throw new Error('La identidad todavía no está verificada')
            setDocumentoVerificado(true)
            setErroresDocumento({})
            // Consulta única con a lo sumo un reintento si el servicio no responde; si no hay respuesta se
            // continúa con la verificación facial, que vuelve a validar todo en el servidor.
            let facial = null
            for (let intento = 0; intento < 2 && !facial; intento++) {
                try {
                    facial = await registroService(role, 'facial/estado', { proceso_id: procesoId })
                } catch (error) {
                    if (![502, 503, 504, undefined].includes(error.response?.status)) throw error
                    if (intento === 0) await new Promise(resolve => setTimeout(resolve, 1200))
                }
            }
            if (facial?.data?.obligatoria === false || ['aprobado', 'alternativa'].includes(facial?.data?.estado)) {
                setFacialListo(true)
                report("success","Los datos del documento coinciden. Continúa con el siguiente paso.")
                setStep(3)
            } else {
                report("success","Documento verificado. Completa la verificación facial para continuar.")
            }
        }, "Verificando tu documento de identidad…")
    }

    const handleArchivoDocumento = (cara, archivo) => {
        if (ocupado.current || documentoVerificado) return
        if (cara === 'frente') setDocumentoFrente(archivo)
        else setDocumentoReverso(archivo)
        setDocumentoCargado(false)
        setErroresDocumento({})
        setErrors({})
    }

    const handleFacialListo = (estado) => {
        setFacialListo(true)
        report("success", estado === 'alternativa'
            ? "Verificación alternativa registrada. Continúa con el siguiente paso."
            : estado === 'revision'
                ? "Tu identidad se revisará junto con tu solicitud profesional. Continúa con tu registro."
                : "Rostro verificado. Continúa con el siguiente paso.")
        setStep(3)
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
        erroresDocumento,
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
        // Al escribir de nuevo desaparece el error del código anterior.
        setOtp: (valor) => {
            setOtp(valor)
            setErrors(prev => prev.codigo ? { ...prev, codigo: '' } : prev)
        },
        limpiarOtp: () => setOtp(''),
        documentoFrente,
        setDocumentoFrente: (archivo) => handleArchivoDocumento('frente', archivo),
        documentoReverso,
        setDocumentoReverso: (archivo) => handleArchivoDocumento('reverso', archivo),
        handleVerificarOtp,
        handleDocumento,
        handleBack,
        handleReenviarOtp,
        documentoVerificado,
        facialListo,
        handleFacialListo,
        correoConfigurado,
        correoVerificado,
    }
}
