import Image from "next/image"
import styles from "./login.module.css"
import LoginForm from "../../../../components/forms/loginForm/loginForm"
import Link from "next/link"
export default function login() {
    return (
        <div className={styles.mainLogin}>
            <div className={styles.container}>
                <div className={styles.logo}>
                    <Image src='/images/logoCara.png' width='100' height='100' alt="logo" />
                    <h1><span>Doc</span> Smart</h1>
                </div>
                <h2>Inicia sesión:</h2>
                <div className={styles.form}>
                    <LoginForm></LoginForm>
                </div>
                <div className={styles.containerLinks}>
                    <Link href='/forgot-password' className={styles.link}>¿Olvidaste tu contraseña?</Link>
                    <Link href='/rol' className={styles.link}>¿No tienes una cuenta?, registrate aquí</Link>
                    <Link href='/' className={styles.link}>Volver al inicio</Link>
                </div>
            </div>
        </div>
    )
}