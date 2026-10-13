"use client";

import Link from "next/link";
import {
    ArrowLeft,
    Check,
    Circle,
    CircleAlert,
    KeyRound,
    LockKeyhole,
    ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { getPasswordRequirements } from "@/app/validations/resetPasswordValidate";
import Button from "../../ui/Button/Button";
import Input from "../../ui/Input/Input";
import VerificationStatus from "../../ui/VerificationStatus/VerificationStatus";
import useResetPasswordForm from "./useResetPasswordForm";
import styles from "./resetPasswordForm.module.css";

const stateTransition = {
    duration: 0.22,
    ease: [0.23, 1, 0.32, 1],
};

export default function ResetPasswordForm() {
    const {
        formData,
        handleChange,
        handleSubmit,
        loading,
        errors,
        feedback,
        successMessage,
        tokenError,
    } = useResetPasswordForm();
    const reducedMotion = useReducedMotion();
    const passwordRequirements = getPasswordRequirements(formData.nueva_contraseña);
    const passwordsMatch = Boolean(formData.confirmarContraseña)
        && formData.nueva_contraseña === formData.confirmarContraseña;
    const stateMotion = {
        initial: reducedMotion ? false : { opacity: 0, transform: "translateY(8px)" },
        animate: { opacity: 1, transform: "translateY(0)" },
        transition: reducedMotion ? { duration: 0 } : stateTransition,
    };

    if (successMessage) {
        return (
            <motion.section
                {...stateMotion}
                className={styles.resultState}
                role="status"
                aria-live="polite"
            >
                <span className={`${styles.resultIcon} ${styles.successIcon}`} aria-hidden="true">
                    <Check size={30} strokeWidth={2.1} />
                </span>
                <div className={styles.resultCopy}>
                    <h2>Tu nueva contraseña está lista</h2>
                    <p>{successMessage}. Ya puedes ingresar nuevamente con tus credenciales.</p>
                </div>
                <Link href="/login" className={styles.primaryLink}>
                    Ir a iniciar sesión
                </Link>
                <p className={styles.resultHint}>
                    El enlace de recuperación ya no puede volver a utilizarse.
                </p>
            </motion.section>
        );
    }

    if (tokenError) {
        return (
            <motion.section
                {...stateMotion}
                className={styles.resultState}
                role="alert"
            >
                <span className={`${styles.resultIcon} ${styles.errorIcon}`} aria-hidden="true">
                    <CircleAlert size={30} strokeWidth={1.9} />
                </span>
                <div className={styles.resultCopy}>
                    <h2>Necesitas un nuevo enlace</h2>
                    <p>{tokenError}</p>
                </div>
                <Link href="/forgot-password" className={styles.primaryLink}>
                    Solicitar otro enlace
                </Link>
                <Link href="/login" className={styles.secondaryLink}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    Volver a iniciar sesión
                </Link>
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

            <div className={styles.field}>
                <label htmlFor="new-password">Nueva contraseña</label>
                <div className={styles.inputControl}>
                    <LockKeyhole className={styles.inputIcon} size={19} aria-hidden="true" />
                    <Input
                        id="new-password"
                        name="nueva_contraseña"
                        type="password"
                        value={formData.nueva_contraseña}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="Crea una contraseña segura"
                        autoComplete="new-password"
                        readOnly={loading}
                        sizeEye={19}
                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                        aria-invalid={Boolean(errors.nueva_contraseña)}
                        aria-describedby={errors.nueva_contraseña
                            ? "new-password-requirements new-password-error"
                            : "new-password-requirements"}
                    />
                </div>
                {errors.nueva_contraseña && (
                    <p id="new-password-error" className={styles.fieldError}>
                        {errors.nueva_contraseña}
                    </p>
                )}
            </div>

            <div
                id="new-password-requirements"
                className={styles.requirements}
                aria-label="Requisitos de la contraseña"
            >
                <div className={styles.requirementsHeading}>
                    <ShieldCheck size={19} aria-hidden="true" />
                    <span>Tu contraseña debe incluir</span>
                </div>
                <ul>
                    {passwordRequirements.map((requirement) => (
                        <li
                            key={requirement.id}
                            className={requirement.met ? styles.requirementMet : undefined}
                        >
                            <span className={styles.requirementIcon} aria-hidden="true">
                                {requirement.met
                                    ? <Check size={14} strokeWidth={2.4} />
                                    : <Circle size={12} strokeWidth={1.7} />}
                            </span>
                            <span>{requirement.label}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={styles.field}>
                <label htmlFor="confirm-password">Confirmar contraseña</label>
                <div className={styles.inputControl}>
                    <KeyRound className={styles.inputIcon} size={19} aria-hidden="true" />
                    <Input
                        id="confirm-password"
                        name="confirmarContraseña"
                        type="password"
                        value={formData.confirmarContraseña}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="Repítela para confirmar"
                        autoComplete="new-password"
                        readOnly={loading}
                        sizeEye={19}
                        validationAttempt={feedback.kind === "error" ? feedback.revision : 0}
                        aria-invalid={Boolean(errors.confirmarContraseña)}
                        aria-describedby={errors.confirmarContraseña
                            ? "confirm-password-error"
                            : "confirm-password-help"}
                    />
                </div>
                {errors.confirmarContraseña ? (
                    <p id="confirm-password-error" className={styles.fieldError}>
                        {errors.confirmarContraseña}
                    </p>
                ) : (
                    <p
                        id="confirm-password-help"
                        className={passwordsMatch ? styles.matchSuccess : styles.fieldHelp}
                    >
                        {passwordsMatch
                            ? "Las contraseñas coinciden."
                            : "Escribe exactamente la misma contraseña."}
                    </p>
                )}
            </div>

            <div className={styles.actions}>
                <Button
                    type="submit"
                    className={styles.submitButton}
                    loading={loading}
                    disabled={loading}
                >
                    <Check size={18} aria-hidden="true" />
                    Guardar nueva contraseña
                </Button>
                <Link href="/login" className={styles.backLink}>
                    <ArrowLeft size={17} aria-hidden="true" />
                    Volver a iniciar sesión
                </Link>
            </div>
        </form>
    );
}
