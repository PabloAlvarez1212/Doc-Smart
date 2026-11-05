import AuthCard from "../../../../components/ui/VerificationStatus/AuthCard";
import Image from "next/image"
import styles from "./login.module.css"
import LoginForm from "../../../../components/forms/loginForm/loginForm"
import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"
export default function login() {
    return (
        <div className={styles.mainLogin}>
            <AuthCard className={styles.container}>
                <div className={styles.logo}>
                    <Image src='/images/logoCara.png' width='100' height='100' alt="logo" loading="eager"/>
                    <h1>Doc<span>Smart</span></h1>
                </div>
                <div className={styles.heading}>
                    <h2>Inicia sesión</h2>
                    <p>Entra a tu espacio de salud.</p>
                </div>
                <div className={styles.form}>
                    <LoginForm></LoginForm>
                </div>
                <div className={styles.containerLinks}>
                    <div className={styles.divider}><span>¿Aún no tienes cuenta?</span></div>
                    <Link href='/rol' className={styles.createAccount}><UserPlus size={18} aria-hidden="true" />Crear una cuenta</Link>
                    <Link href='/' className={styles.link}><ArrowLeft size={16} aria-hidden="true" />Volver al inicio</Link>
                </div>
            </AuthCard>
        </div>
    )
}
