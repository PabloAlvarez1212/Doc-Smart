"use client";
import Swal from "sweetalert2";
import { forgotPasswordValidate } from "@/app/validations/forgotPasswordValidate";
import { useState } from "react";
import styles from "./forgotPassword.module.css"
import { forgotPasswordService } from "@/app/services/authService";

export const useForgotPassword = () => {
    const [loading,setLoading] = useState(false);
    const [formData, setFormData] = useState({
        correo: ''
    })
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }
    const handleSubmit = async (e) => {
        e.preventDefault()
        const validationErrors = forgotPasswordValidate(formData);
        if (Object.keys(validationErrors).length > 0) {
            Swal.fire({
                icon: 'error',
                title: 'Campos inválidos',
                text: Object.values(validationErrors)[0],
                customClass: { popup: styles.swal }
            })
            return
        }
        setLoading(true)
        try{
            const data = await forgotPasswordService(formData);
            await Swal.fire({
                    icon: 'success',
                    title: "Exito",
                    text: `email enviado correctamente`,
                    customClass: { popup: styles.swal }
                })
                console.log(data);
        } catch(error){
            console.log(error)
            const errores = error.response?.data?.errores;
            let mensaje = 'Error al conectar con el servidor';
            if (errores && Object.keys(errores).length > 0){
                mensaje = Object.values(errores)[0][0];
            }
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: mensaje,
                customClass: { popup: styles.swal }
            })
        }
        finally{
            setLoading(false)
        }
    }
    return { handleChange, handleSubmit, formData , loading};
}