'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { validateLogin } from '@/app/validations/loginvalidate'
import { loginService } from '@/app/services/authService'
import styles from "./loginForm.module.css"

export const useLogin = () => {
    const router = useRouter()
    const [formData, setFormData] = useState({
        correo: '',
        contraseña: ''
    })
    const [errors, setErrors] = useState({})

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
        setErrors({ ...errors, [e.target.name]: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const validationErrors = validateLogin(formData)
        if (Object.keys(validationErrors).length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Campos inválidos',
                text: Object.values(validationErrors)[0],
                customClass: { popup: styles.swal }
            })
            setErrors(validationErrors)
            return
        }

        try {
            const data = await loginService(formData)
            if (data.rol === 'paciente') {
                await Swal.fire({
                    icon: 'success',
                    title: data.message,
                    text: `Bienvenido de nuevo ${data.nombre} ${data.apellido}, a ingresado como ${data.rol}`,
                    customClass: { popup: styles.swal }
                })
                router.push('/patient/home')
            } else if (data.rol === 'doctor') {
                await Swal.fire({
                    icon: 'success',
                    title: data.message,
                    text: `Bienvenido de nuevo ${data.nombre} ${data.apellido}, a ingresado como ${data.rol}`,
                    customClass: { popup: styles.swal }
                })
                router.push('/doctor/home')
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.error || 'Error al conectar con el servidor',
                customClass: { popup: styles.swal }
            })
        }
    }

    return { formData, errors, handleChange, handleSubmit }
}