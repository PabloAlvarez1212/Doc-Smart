'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { validateLogin } from '@/app/validations/loginvalidate'
import { loginService } from '@/app/services/authService'
import { obtenerPrimerError } from '@/app/utils/errrorUtils'
import styles from './loginForm.module.css'

export const useLogin = () => {
    const router = useRouter()
    const [formData, setFormData] = useState({
        correo: '',
        contraseña: ''
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState({
        kind: 'idle',
        message: '',
        revision: 0
    })

    // Estado del bloqueo temporal.
    const [bloqueo, setBloqueo] = useState({
        correo: '',
        hasta: 0
    })

    const [segundosRestantes, setSegundosRestantes] = useState(0)

    const busy = useRef(false)

    const report = (kind, message) => {
        setFeedback(prev => ({
            kind,
            message,
            revision: prev.revision + 1
        }))
    }

    // Identifica si el correo actual está bloqueado.
    const correoActual = formData.correo.trim().toLowerCase()

    const estaBloqueado = (
        segundosRestantes > 0 &&
        bloqueo.correo === correoActual
    )

    // Actualiza la cuenta regresiva.
    useEffect(() => {

        if (!bloqueo.hasta) return

        const actualizarTiempo = () => {

            const restantes = Math.max(
                0,
                Math.ceil((bloqueo.hasta - Date.now()) / 1000)
            )

            setSegundosRestantes(restantes)
        }

        actualizarTiempo()

        const intervalo = setInterval(
            actualizarTiempo,
            1000
        )

        return () => clearInterval(intervalo)

    }, [bloqueo.hasta])

    // Formatea el tiempo restante como MM:SS.
    const formatearTiempo = (segundos) => {

        const minutos = Math.floor(segundos / 60)
        const segundosFinales = segundos % 60

        return `${String(minutos).padStart(2, '0')}:${String(segundosFinales).padStart(2, '0')}`
    }

    const tiempoRestante = formatearTiempo(segundosRestantes)

    const handleChange = (e) => {

        if (busy.current) return

        const { name, value } = e.target

        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        setErrors(prev => ({
            ...prev,
            [name]: ''
        }))

    }

    const handleSubmit = async (e) => {

        e.preventDefault()

        // Evita solicitudes duplicadas.
        if (busy.current || estaBloqueado) return

        const validationErrors = validateLogin(formData)

        if (Object.keys(validationErrors).length > 0) {

            report(
                'error',
                Object.values(validationErrors)[0]
            )

            setErrors(validationErrors)

            return
        }

        busy.current = true

        setLoading(true)

        setErrors({})

        report(
            'pending',
            'Comprobando tus credenciales…'
        )

        try {

            const data = await loginService(formData)

            // Inicio exitoso.
            setBloqueo({
                correo: '',
                hasta: 0
            })

            setSegundosRestantes(0)

            report(
                'success',
                'Sesión iniciada. Abriendo tu espacio…'
            )

            if (data.data.rol === 'paciente') {

                await Swal.fire({
                    icon: 'success',
                    title: data.message || 'Sesión iniciada',
                    text: `Bienvenido de nuevo, ${data.data.nombre} ${data.data.apellido}.`,
                    customClass: {
                        popup: styles.swal
                    }
                })

                router.push('/patient/home')

            } else if (data.data.rol === 'doctor') {

                await Swal.fire({
                    icon: 'success',
                    title: data.message || 'Sesión iniciada',
                    text: `Bienvenido de nuevo, ${data.data.nombre} ${data.data.apellido}.`,
                    customClass: {
                        popup: styles.swal
                    }
                })

                router.push('/doctor/home')

            } else if (data.data.rol === 'admin') {

                await Swal.fire({
                    icon: 'success',
                    title: data.message || 'Sesión iniciada',
                    text: `Bienvenido de nuevo, ${data.data.nombre} ${data.data.apellido}.`,
                    customClass: {
                        popup: styles.swal
                    }
                })

                router.push('/admin/dashboard')

            }

        } catch (error) {

            const status = error.response?.status

            const respuesta = error.response?.data

            const errores = respuesta?.errores

            let mensaje = (
                obtenerPrimerError(errores?.general) ||
                obtenerPrimerError(errores?.correo) ||
                obtenerPrimerError(errores?.contraseña) ||
                respuesta?.mensaje ||
                'Error al conectar con el servidor'
            )

            // Bloqueo temporal: HTTP 429.
            if (status === 429) {

                const segundos = Number(
                    errores?.segundos_restantes ??
                    respuesta?.segundos_restantes ??
                    error.response?.headers?.['retry-after']
                )

                if (Number.isFinite(segundos) && segundos > 0) {

                    const duracion = Math.ceil(segundos)

                    setBloqueo({
                        correo: correoActual,
                        hasta: Date.now() + duracion * 1000
                    })

                    setSegundosRestantes(duracion)

                }

            }

            // Errores específicos de los campos.
            if (errores) {

                setErrors({
                    correo: obtenerPrimerError(errores.correo) || '',
                    contraseña: obtenerPrimerError(errores.contraseña) || ''
                })

            }

            report('error', mensaje)

        } finally {

            busy.current = false

            setLoading(false)

        }

    }

    return {
        formData,
        errors,
        loading,
        feedback,
        handleChange,
        handleSubmit,
        estaBloqueado,
        segundosRestantes,
        tiempoRestante
    }

}