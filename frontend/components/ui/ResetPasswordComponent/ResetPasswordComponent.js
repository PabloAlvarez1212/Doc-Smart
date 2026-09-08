"use client";

import {
    LockKeyhole,
    ShieldCheck
} from "lucide-react";

import Input from "../Input/Input";
import Button from "../Button/Button";
import styles from "./ResetPasswordComponent.module.css";

export default function ResetPasswordFormComponent() {
    return (
        <form
            className={styles.form}
            onSubmit={(event) => event.preventDefault()}
        >

            <div className={styles.field}>
                <label htmlFor="current-password">
                    Contraseña actual
                </label>

                <div className={styles.inputContainer}>
                    <LockKeyhole
                        size={19}
                        className={styles.inputIcon}
                    />

                    <Input
                        id="current-password"
                        type="password"
                        placeholder="Ingresa tu contraseña actual"
                        autoComplete="current-password"
                    />
                    
                </div>
            </div>


            <div className={styles.field}>
                <label htmlFor="new-password">
                    Nueva contraseña
                </label>

                <div className={styles.inputContainer}>
                    <LockKeyhole
                        size={19}
                        className={styles.inputIcon}
                    />

                    <Input
                        id="new-password"
                        type="password"
                        placeholder="Ingresa tu nueva contraseña"
                        autoComplete="new-password"
                    />

                </div>
            </div>


            <div className={styles.field}>
                <label htmlFor="confirm-password">
                    Confirmar nueva contraseña
                </label>

                <div className={styles.inputContainer}>
                    <LockKeyhole
                        size={19}
                        className={styles.inputIcon}
                    />

                    <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirma tu nueva contraseña"
                        autoComplete="new-password"
                    />

                </div>
            </div>


            <div className={styles.requirements}>
                <div className={styles.requirementsTitle}>
                    <ShieldCheck size={20} />

                    <strong>
                        La nueva contraseña debe contener:
                    </strong>
                </div>

                <ul>
                    <li>Al menos 8 caracteres</li>
                    <li>No se permiten los caracteres (&lt;, &gt;, &quot;, &apos;, &amp;) en la contraseña</li>
                    <li>Una letra mayúscula</li>
                    <li>Una letra minúscula</li>
                    <li>Un número</li>
                    <li>Un carácter especial</li>
                </ul>
            </div>


            <div className={styles.actions}>
                <Button
                    type="submit"
                    className={styles.submitButton}
                >
                    Guardar cambios
                </Button>
            </div>

        </form>
    );
}