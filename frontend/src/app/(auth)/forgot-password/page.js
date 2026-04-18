import styles from "./forgotPassword.module.css"
import Image from "next/image"
import Cards from "../../../../components/ui/Card/Cards"
import ForgotPasswordForm from "../../../../components/forms/forgotPasswordForm/forgotPasswordForm"
import { AlertTriangle } from "lucide-react";

export default function ForgotPassword() {
    return (
        <div className={styles.containerMain}>
            <div className={styles.containerCard}>
                <Image src='/images/logo-seguridad.png' width='200' height='200' alt="logo"/>
                <div className={styles.title}>
                    <h1>¿Olvidaste tu contraseña?</h1>
                    <p>No te preocupes, te ayudaremos a recuperarla</p>
                </div>
                <div className={styles.instruction}>
                    <Cards
                        description='Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.'
                        className={styles.card}
                        layout="horizontal"
                        title= {<AlertTriangle color="orange" size={30} />}
                        variant="compact"
                        align="center"
                    />
                </div>
                <div className={styles.containerForm}>
                    <ForgotPasswordForm></ForgotPasswordForm>
                </div>
            </div>
        </div>
    )
}