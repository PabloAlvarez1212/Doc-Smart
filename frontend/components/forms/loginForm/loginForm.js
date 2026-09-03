'use client'
import { useLogin } from './useLogin'
import Button from "../../ui/Button/Button"
import Input from "../../ui/Input/Input"
import styles from "./loginForm.module.css"

export default function LoginForm() {
    const { formData, errors, handleChange, handleSubmit } = useLogin()
    
    return (
        <form className={styles.formLogin} onSubmit={handleSubmit}>
            <Input type="email" placeholder="Correo:" name="correo" id="correo" className={styles.input} value={formData.correo} onChange={handleChange} />
            {errors.correo && <p className={styles.error}>{errors.correo}</p>}

            <Input type="password" placeholder="         Contraseña:" name="contraseña" id="contraseña" className={styles.input} value={formData.contraseña} onChange={handleChange} />
            {errors.contraseña && <p className={styles.error}>{errors.contraseña}</p>}

            <Button type="submit" className={styles.btn} >Entrar</Button>
        </form>
    )
}