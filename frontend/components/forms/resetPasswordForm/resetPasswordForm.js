import styles from "./resetPasswordForm.module.css"
import Input from "../../ui/Input/Input"
import Button from "../../ui/Button/Button"
import useResetPasswordForm from "./useResetPasswordForm"
import { AlertCircleIcon } from "lucide-react"
export default function ResetPasswordForm() {
    return (
        <form className={styles.form}>
            <div className={styles.containerMain}>
                <Input className={styles.input} type="password" placeholder="Nueva contraseña" />
                <ul className={styles.list}>
                    <div className={styles.listItem}>
                        <AlertCircleIcon size={30} color="orange" />
                        <li>La contraseña debe tener mínimo 8 caracteres</li>
                    </div>
                    <div className={styles.listItem}>
                        <AlertCircleIcon size={30} color="orange" />
                        <li>No se permiten los caracteres (&lt;, &gt;, &quot;, &apos;, &amp;) en la contraseña</li>
                    </div>
                    <div className={styles.listItem}>
                        <AlertCircleIcon size={30} color="orange" />
                        <li>La contraseña debe contener al menos un carácter especial</li>
                    </div>
                    <div className={styles.listItem}>
                        <AlertCircleIcon size={30} color="orange" />
                        <li>La contraseña debe tener mínimo una mayúscula</li>
                    </div>
                    <div className={styles.listItem}>
                        <AlertCircleIcon size={30} color="orange" />
                        <li>La contraseña debe tener mínimo una minúscula</li>
                    </div>
                    <div className={styles.listItem}>
                        <AlertCircleIcon size={30} color="orange" />
                        <li>La contraseña debe tener mínimo un número</li>
                    </div>
                </ul>
                <Input type="password" className={styles.input} placeholder="Confirmar nueva contraseña" />
                <Button type="submit">Cambiar contraseña</Button>
            </div>
        </form>
    )
}