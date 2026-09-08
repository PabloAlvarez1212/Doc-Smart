"use client";
import Swal from "sweetalert2";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import Input from "../Input/Input";
import Button from "../Button/Button";
import styles from "./ResetPasswordComponent.module.css";
import { useState } from "react";
import { useChangePassword } from "./useResetPassword";
import useLogout from "../../hooks/useLogout";
export default function ResetPasswordFormComponent() {
    const { cambiarContraseña, loading } = useChangePassword()
    const { logoutDirecto } = useLogout()
    const [form, setForm] = useState({
        contraseña_actual: "",
        nueva_contraseña: "",
        confirmar_contraseña: ""
    });
    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            !form.contraseña_actual.trim() ||
            !form.nueva_contraseña.trim() ||
            !form.confirmar_contraseña.trim()
        ) {
            await Swal.fire({
                icon: "warning",
                title: "Campos incompletos",
                text: "Debes completar todos los campos.",
                confirmButtonText: "Aceptar"
            });

            return;
        }
        
        if (form.nueva_contraseña !== form.confirmar_contraseña) {
            await Swal.fire({
                icon: "warning",
                title: "Las contraseñas no coinciden",
                text: "Verifica que la nueva contraseña y su confirmación sean iguales.",
                confirmButtonText: "Aceptar",
            });

            return;
        }

        const data = {
            contraseña_actual: form.contraseña_actual,
            nueva_contraseña: form.nueva_contraseña
        };

        const ok = await cambiarContraseña(data);

        if (ok) {
            setForm({
                contraseña_actual: "",
                nueva_contraseña: "",
                confirmar_contraseña: ""
            });
            logoutDirecto()
        }
    };

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit}
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
                        name="contraseña_actual"
                        value={form.contraseña_actual}
                        onChange={handleChange}
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
                        name="nueva_contraseña"
                        value={form.nueva_contraseña}
                        onChange={handleChange}
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
                        name="confirmar_contraseña"
                        value={form.confirmar_contraseña}
                        onChange={handleChange}
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
                    disabled={loading}
                    className={styles.submitButton}
                >
                    {loading
                        ? "Guardando..."
                        : "Guardar cambios"}

                </Button>
            </div>

        </form>
    );
}