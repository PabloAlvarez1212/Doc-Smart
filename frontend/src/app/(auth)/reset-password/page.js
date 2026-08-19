import { Suspense } from "react";
import Link from "next/link";

import ResetPasswordForm from "../../../../components/forms/resetPasswordForm/resetPasswordForm";
import styles from "./resetPassword.module.css";

export default function ResetPassword() {
  return (
    <div className={styles.containerMain}>
      <div className={styles.containerCard}>
        <div className={styles.containerTitle}>
          <h1>Cambia tu contraseña</h1>
          <p>Crea una nueva contraseña para acceder a tu cuenta.</p>
        </div>

        <div className={styles.form}>
          <Suspense fallback={<p>Cargando formulario...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <Link href="/" className={styles.link}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}