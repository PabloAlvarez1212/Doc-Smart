"use client";
import { useState } from "react";
import { resetPasswordService } from "@/app/services/authService";
import Swal from "sweetalert2";
import styles from "./resetPasswordForm.module.css"
import ResetPasswordValidate from "@/app/validations/resetPasswordValidate";
import { useSearchParams } from 'next/navigation'
import { useRouter } from "next/navigation";
import { obtenerPrimerError } from '@/app/utils/errrorUtils'

export default function useResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token')
    const [formData, setFormData] = useState({
        token: token,
        nueva_contraseña: "",
        confirmarContraseña: ""
    })
    const [loading, setLoading] = useState(false);
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }
    const handleSubmit = async (e) => {
        e.preventDefault()
        const validateErrors = ResetPasswordValidate(formData);
        if (Object.keys(validateErrors).length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Object.values(validateErrors)[0],
                customClass: { popup: styles.swal }
            })
            return
        }
        setLoading(true)
        try {
            const data = await resetPasswordService(formData);
            await Swal.fire({
                icon: 'success',
                title: data.mensaje,
                text: 'Debes iniciar sesion nuevamente',
                customClass: { popup: styles.swal }
            }).then(() => {
                router.push('/login')
            })
        } catch (error) {
            console.log(error)
            const errores = error.response?.data?.errores;
            let mensaje =error.response?.data?.mensaje ||'Error al conectar con el servidor';
            const errorExtraido = obtenerPrimerError(errores);
            if (errorExtraido) {
                mensaje = errorExtraido;
            }

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: mensaje,
                customClass: { popup: styles.swal }
            })
        }
        finally {
            setLoading(false)
        }
    }

    return { formData, handleChange, handleSubmit, loading }

}