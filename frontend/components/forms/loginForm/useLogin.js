'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { validateLogin } from '@/app/validations/loginvalidate'
import { loginService } from '@/app/services/authService'
import styles from "./loginForm.module.css"
import { obtenerPrimerError } from '@/app/utils/errrorUtils'

export const useLogin = () => {
    const router = useRouter()
    const [formData, setFormData] = useState({
        correo: '',
        contraseña: ''
    })
    const [errors, setErrors] = useState({})
    const [loading,setLoading] = useState(false)
    const [feedback,setFeedback] = useState({kind:'idle',message:'',revision:0})
    const busy = useRef(false)
    const report=(kind,message)=>setFeedback(prev=>({kind,message,revision:prev.revision+1}))

    const handleChange = (e) => {
        if (busy.current) return
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setErrors({ ...errors, [e.target.name]: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (busy.current) return
        const validationErrors = validateLogin(formData)
        if (Object.keys(validationErrors).length > 0) {
            report('error',Object.values(validationErrors)[0])
            setErrors(validationErrors)
            return
        }

        busy.current=true
        setLoading(true)
        report("pending","Comprobando tus credenciales…")
        try {
            const data = await loginService(formData)
            report("success","Sesión iniciada. Abriendo tu espacio…")
            
            if (data.data.rol === 'paciente') {
                await Swal.fire({
                    icon: 'success',
                    title: data.message || "Sesión iniciada",
                    text: `Bienvenido de nuevo, ${data.data.nombre} ${data.data.apellido}.`,
                    customClass: { popup: styles.swal }
                })
                router.push('/patient/home')
            } else if (data.data.rol === 'doctor') {
                await Swal.fire({
                    icon: 'success',
                    title: data.message || "Sesión iniciada",
                    text: `Bienvenido de nuevo, ${data.data.nombre} ${data.data.apellido}.`,
                    customClass: { popup: styles.swal }
                })
                router.push('/doctor/home')
            } else if (data.data.rol === 'admin') {
                await Swal.fire({
                    icon: 'success',
                    title: data.message || "Sesión iniciada",
                    text: `Bienvenido de nuevo, ${data.data.nombre} ${data.data.apellido}.`,
                    customClass: { popup: styles.swal }
                })
                router.push('/admin/dashboard')
            }
        } catch (error) {

            const errores = error.response?.data?.errores;
            let mensaje =error.response?.data?.mensaje ||'Error al conectar con el servidor';
            const errorExtraido = obtenerPrimerError(errores);
            if (errorExtraido) {
                mensaje = errorExtraido;
            }

            report('error',mensaje)
            if (errores) setErrors(errores)
        } finally {busy.current=false;setLoading(false)}
    }

    return { formData, errors, loading, feedback, handleChange, handleSubmit }
}