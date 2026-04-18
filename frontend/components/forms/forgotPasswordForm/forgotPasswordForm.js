"use client"
import Input from "../../ui/Input/Input"
import Button from "../../ui/Button/Button"
import Link from "next/link"
import styles from "./forgotPassword.module.css"
import { useForgotPassword } from "./useForgotPasswordForm"

export default function ForgotPasswordForm() {
    const { handleChange, handleSubmit,formData,loading } = useForgotPassword();
    return (
        <form onSubmit={handleSubmit}>
            <div className={styles.containerForm}>
                <label>Correo electrónico:</label>
                <div className={styles.inputContainer}>
                    <Input type="email" placeholder='ejemplo@gmail.com' name="correo" id="correo" value={formData.correo} className={styles.input} onChange={handleChange} />
                </div>
                <div className={styles.btns}>
                    <Button size="sm" type="submit" loading={loading}>Enviar correo</Button>
                    <Link href='/'>Volver al inicio</Link>
                </div>
            </div>
        </form>
    )
}