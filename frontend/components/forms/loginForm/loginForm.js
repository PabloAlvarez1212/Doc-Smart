'use client'
import VerificationStatus from '../../ui/VerificationStatus/VerificationStatus'
import { useLogin } from './useLogin'
import Button from '../../ui/Button/Button'
import Input from '../../ui/Input/Input'
import { LockKeyhole } from 'lucide-react'
import styles from './loginForm.module.css'

export default function LoginForm() {

    const {
        formData,
        errors,
        loading,
        feedback,
        handleChange,
        handleSubmit,
        estaBloqueado,
        tiempoRestante
    } = useLogin()

    return (

        <form
            className={styles.formLogin}
            onSubmit={handleSubmit}
            aria-busy={loading}
            noValidate
        >

            {!estaBloqueado && (
                <VerificationStatus state={feedback} />
            )}

            {estaBloqueado && (
                <div
                    className={styles.bloqueoLogin}
                    role="alert"
                    aria-labelledby="login-lock-title"
                    aria-describedby="login-lock-description"
                >
                    <span className={styles.bloqueoIcono} aria-hidden="true">
                        <LockKeyhole size={18} strokeWidth={2} />
                    </span>

                    <div className={styles.bloqueoContenido}>
                        <p id="login-lock-title" className={styles.bloqueoTitulo}>
                            Inicio de sesión bloqueado
                        </p>

                        <p
                            id="login-lock-description"
                            className={styles.bloqueoDescripcion}
                        >
                            Podrás intentarlo nuevamente en
                        </p>
                    </div>

                    <span
                        className={styles.bloqueoTiempo}
                        aria-hidden="true"
                    >
                        {tiempoRestante}
                    </span>

                    <span className={styles.srOnly}>
                        Espera a que termine la cuenta regresiva antes de volver a intentarlo.
                    </span>
                </div>
            )}

            <div className={styles.inputs}>

                <label
                    htmlFor="correo"
                    className={styles.label}
                >
                    Correo electrónico
                </label>

                <Input
                    validationAttempt={
                        feedback.kind === 'error'
                            ? feedback.revision
                            : 0
                    }
                    readOnly={loading}
                    autoComplete="username"
                    aria-invalid={Boolean(errors.correo)}
                    aria-describedby={
                        errors.correo
                            ? 'login-email-error'
                            : undefined
                    }
                    type="email"
                    placeholder="Correo:"
                    name="correo"
                    id="correo"
                    className={styles.input}
                    value={formData.correo}
                    onChange={handleChange}
                />

                {errors.correo && (
                    <p
                        id="login-email-error"
                        className={styles.error}
                    >
                        {errors.correo}
                    </p>
                )}

                <label
                    htmlFor="contraseña"
                    className={styles.label}
                >
                    Contraseña
                </label>

                <Input
                    validationAttempt={
                        feedback.kind === 'error'
                            ? feedback.revision
                            : 0
                    }
                    readOnly={loading}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.contraseña)}
                    aria-describedby={
                        errors.contraseña
                            ? 'login-password-error'
                            : undefined
                    }
                    type="password"
                    placeholder="Contraseña:"
                    sizeEye={26}
                    name="contraseña"
                    id="contraseña"
                    className={styles.input}
                    value={formData.contraseña}
                    onChange={handleChange}
                />

                {errors.contraseña && (
                    <p
                        id="login-password-error"
                        className={styles.error}
                    >
                        {errors.contraseña}
                    </p>
                )}

            </div>

            <Button
                type="submit"
                className={styles.btn}
                disabled={loading || estaBloqueado}
            >
                {loading
                    ? 'Iniciando sesión…'
                    : estaBloqueado
                        ? 'Espera para volver a intentar'
                        : 'Entrar'
                }
            </Button>

        </form>
    )
}