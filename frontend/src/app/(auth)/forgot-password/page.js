import Image from "next/image";
import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import ForgotPasswordForm from "../../../../components/forms/forgotPasswordForm/forgotPasswordForm";
import styles from "./forgotPassword.module.css";

export default function ForgotPassword() {
    return (
        <main className={styles.page}>
            <section className={styles.securityPanel} aria-label="Protección de tu cuenta">
                <Link href="/" className={styles.brand} aria-label="Ir al inicio de DocSmart">
                    <span className={styles.brandMark}>
                        <Image src="/images/logoCara.png" width={42} height={42} alt="" priority />
                    </span>
                    <span><strong>Doc</strong>Smart</span>
                </Link>

                <div className={styles.securityContent}>
                    <div className={styles.securityCopy}>
                        <span className={styles.securityIcon} aria-hidden="true">
                            <LockKeyhole size={24} strokeWidth={1.8} />
                        </span>
                        <p className={styles.securityTitle}>Recupera el acceso con tranquilidad</p>
                        <p>Te enviaremos las instrucciones al correo asociado con tu cuenta.</p>
                    </div>

                    <div className={styles.illustration} aria-hidden="true">
                        <Image
                            src="/images/logo-seguridad.png"
                            width={560}
                            height={507}
                            alt=""
                        />
                    </div>
                </div>

                <div className={styles.securityAdvice}>
                    <ShieldCheck size={20} strokeWidth={1.8} aria-hidden="true" />
                    <p>No compartas el enlace de recuperación con otras personas.</p>
                </div>
            </section>

            <section className={styles.formPanel}>
                <div className={styles.formContent}>
                    <div className={styles.heading}>
                        <span className={styles.mobileIcon} aria-hidden="true">
                            <LockKeyhole size={24} strokeWidth={1.8} />
                        </span>
                        <h1>¿Olvidaste tu contraseña?</h1>
                        <p>Ingresa tu correo y te ayudaremos a recuperar el acceso a DocSmart.</p>
                        <div className={styles.mobileSecurityAdvice}>
                            <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
                            <p>Tu enlace de recuperación es personal y confidencial.</p>
                        </div>
                    </div>
                    <ForgotPasswordForm />
                </div>
            </section>
        </main>
    );
}
