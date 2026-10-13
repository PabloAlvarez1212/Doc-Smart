"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordService } from "@/app/services/authService";
import ResetPasswordValidate from "@/app/validations/resetPasswordValidate";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";

const initialFeedback = { kind: "idle", message: "", revision: 0 };

export default function useResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [formData, setFormData] = useState({
        token,
        nueva_contraseña: "",
        confirmarContraseña: "",
    });
    const [errors, setErrors] = useState({});
    const [feedback, setFeedback] = useState(initialFeedback);
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [tokenError, setTokenError] = useState(
        token ? "" : "El enlace no contiene un token de recuperación.",
    );

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
        if (feedback.kind === "error") setFeedback(initialFeedback);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        if (!formData.token) {
            setTokenError("El enlace no contiene un token de recuperación.");
            return;
        }

        const validationErrors = ResetPasswordValidate(formData);
        setErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            setFeedback((current) => ({
                kind: "error",
                message: Object.values(validationErrors)[0],
                revision: current.revision + 1,
            }));
            return;
        }

        setLoading(true);
        setFeedback((current) => ({
            kind: "pending",
            message: "Actualizando tu contraseña de forma segura...",
            revision: current.revision + 1,
        }));

        try {
            const data = await resetPasswordService({
                token: formData.token,
                nueva_contraseña: formData.nueva_contraseña,
            });
            setSuccessMessage(data?.mensaje || "Contraseña actualizada correctamente");
            setFeedback((current) => ({
                kind: "success",
                message: data?.mensaje || "Contraseña actualizada correctamente",
                revision: current.revision + 1,
            }));
        } catch (error) {
            const apiErrors = error.response?.data?.errores;
            const message = obtenerPrimerError(apiErrors)
                || error.response?.data?.mensaje
                || "No pudimos actualizar tu contraseña. Inténtalo nuevamente.";
            const normalizedMessage = message.toLocaleLowerCase("es");

            if (
                normalizedMessage.includes("token")
                && (normalizedMessage.includes("inválido") || normalizedMessage.includes("expirado"))
            ) {
                setTokenError(message);
                setFeedback(initialFeedback);
            } else {
                setFeedback((current) => ({
                    kind: "error",
                    message,
                    revision: current.revision + 1,
                }));
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        formData,
        handleChange,
        handleSubmit,
        loading,
        errors,
        feedback,
        successMessage,
        tokenError,
    };
}
