"use client";

import Link from "next/link";
import { ArrowLeft, Check, Mail, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Button from "../../ui/Button/Button";
import Input from "../../ui/Input/Input";
import VerificationStatus from "../../ui/VerificationStatus/VerificationStatus";
import { useForgotPassword } from "./useForgotPasswordForm";
import styles from "./forgotPassword.module.css";

export default function ForgotPasswordForm() {
    const {
        handleChange,
        handleSubmit,
        resetForm,
        formData,
        errors,
        feedback,
        loading,
        submittedEmail,
        successMessage,
    } = useForgotPassword();
    const reducedMotion = useReducedMotion();

    if (submittedEmail) {
        return (
            <motion.section
                className={styles.success}
                initial={reducedMotion ? false : { opacity: 0, transform: "translateY(8px)" }}
                animate={{ opacity: 1, transform: "translateY(0)" }}
                transition={{ duration: reducedMotion ? 0 : .22, ease: [0.23, 1, 0.32, 1] }}
                role="status"
                aria-live="polite"
            >
                <span className={styles.successIcon} aria-hidden="true">
                    <Check size={28} strokeWidth={2.1} />
                </span>
                <div className={styles.successCopy}>
                    <h2>Revisa tu correo</h2>
                    <p>{successMessage}</p>
                </div>
                <div className={styles.emailReceipt}>
                    <Mail size={18} aria-hidden="true" />
                    <span>{submittedEmail}</span>
                </div>
                <p className={styles.successHint}>
                    Si el mensaje tarda en llegar, revisa también la carpeta de correo no deseado.
                </p>
                <div className={styles.successActions}>
                    <Link href="/login" className={styles.primaryLink}>Volver a iniciar sesión</Link>
                    <button type="button" className={styles.resetButton} onClick={resetForm}>
                        <RotateCcw size={16} aria-hidden="true" />
                        Usar otro correo
                    </button>
                </div>
            </motion.section>
        );
    }

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit}
            aria-busy={loading}
            noValidate
        >
            <VerificationStatus state={feedback} />

            <div className={styles.fieldGroup}>
                <label htmlFor="correo" className={styles.label}>Correo electrónico</label>
                <div className={styles.fieldControl}>
                    <Mail className={styles.fieldIcon} size={19} aria-hidden="true" />
                    <Input
                        type="email"
                        placeholder="nombre@correo.com"
                        name="correo"
                        id="correo"
                        value={formData.correo}
                        className={styles.input}
                        onChange={handleChange}
                        readOnly={loading}
                        autoComplete="email"
                        inputMode="email"
                        aria-invalid={Boolean(errors.correo)}
                        aria-describedby={errors.correo ? "forgot-email-error" : "forgot-email-help"}
                    />
                </div>
                {errors.correo ? (
                    <p id="forgot-email-error" className={styles.error}>{errors.correo}</p>
                ) : (
                    <p id="forgot-email-help" className={styles.helper}>
                        Utiliza el mismo correo con el que creaste tu cuenta.
                    </p>
                )}
            </div>

            <div className={styles.actions}>
                <Button
                    className={styles.submit}
                    type="submit"
                    loading={loading}
                    disabled={loading}
                >
                    Enviar instrucciones
                </Button>
                <Link href="/login" className={styles.backLink}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    Volver a iniciar sesión
                </Link>
            </div>
        </form>
    );
}
