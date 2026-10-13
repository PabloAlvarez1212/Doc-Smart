import Image from "next/image";
import Link from "next/link";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import ResetPasswordForm from "../../../../components/forms/resetPasswordForm/resetPasswordForm";
import styles from "./resetPassword.module.css";

function FormFallback() {
    return (
        <div className={styles.formFallback} role="status" aria-live="polite">
            <span className={styles.fallbackLine} />
            <span className={styles.fallbackField} />
            <span className={styles.fallbackField} />
            <span className={styles.fallbackButton} />
            <span className={styles.visuallyHidden}>Cargando formulario...</span>
        </div>
    );
}

export default function ResetPassword() {
    return (
        <main className={styles.page}>
            <section className={styles.formPanel}>
                <Link href="/" className={styles.brand} aria-label="Ir al inicio de DocSmart">
                    <span className={styles.brandMark}>
                        <Image src="/images/logoCara.png" width={42} height={42} alt="" priority />
                    </span>
                    <span><strong>Doc</strong>Smart</span>
                </Link>

                <div className={styles.formContent}>
                    <div className={styles.heading}>
                        <span className={styles.headingIcon} aria-hidden="true">
                            <KeyRound size={24} strokeWidth={1.8} />
                        </span>
                        <h1>Define una nueva contraseña</h1>
                        <p>Crea una clave segura para recuperar el acceso a tu cuenta.</p>
                    </div>

                    <Suspense fallback={<FormFallback />}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>

                <div className={styles.privacyNote}>
                    <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
                    <p>No compartas tu contraseña ni este enlace con otras personas.</p>
                </div>
            </section>

            <section className={styles.visualPanel} aria-label="Seguridad de la cuenta">
                <div className={styles.visualCopy}>
                    <span className={styles.visualIcon} aria-hidden="true">
                        <LockKeyhole size={25} strokeWidth={1.8} />
                    </span>
                    <h2>Protege tu próximo ingreso</h2>
                    <p>Este enlace es personal. Úsalo para crear tu nueva contraseña y volver a DocSmart.</p>
                </div>

                <div className={styles.illustrationStage} aria-hidden="true">
                    <span className={styles.orbit} />
                    <Image
                        src="/images/logo-seguridad.png"
                        width={560}
                        height={507}
                        alt=""
                        sizes="(max-width: 900px) 0px, 38vw"
                    />
                </div>

                <div className={styles.linkNotice}>
                    <ShieldCheck size={19} strokeWidth={1.8} aria-hidden="true" />
                    <p>Al guardar la nueva contraseña, este enlace dejará de funcionar.</p>
                </div>
            </section>
        </main>
    );
}
