"use client";

import { useState } from "react";
import { forgotPasswordValidate } from "@/app/validations/forgotPasswordValidate";
import { forgotPasswordService } from "@/app/services/authService";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";

const initialFeedback = { kind: "idle", message: "", revision: 0 };

export const useForgotPassword = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ correo: "" });
    const [errors, setErrors] = useState({});
    const [feedback, setFeedback] = useState(initialFeedback);
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
        if (feedback.kind === "error") setFeedback(initialFeedback);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;

        const validationErrors = forgotPasswordValidate(formData);
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
            message: "Estamos procesando tu solicitud…",
            revision: current.revision + 1,
        }));

        try {
            const data = await forgotPasswordService(formData);
            setSuccessMessage(
                data?.mensaje || "Procesamos correctamente tu solicitud.",
            );
            setSubmittedEmail(formData.correo.trim());
            setFeedback((current) => ({
                kind: "success",
                message: data?.mensaje || "Solicitud procesada correctamente.",
                revision: current.revision + 1,
            }));
        } catch (error) {
            const errores = error.response?.data?.errores;
            const errorExtraido = obtenerPrimerError(errores);
            const mensaje = errorExtraido
                || error.response?.data?.mensaje
                || "No pudimos procesar la solicitud. Inténtalo nuevamente.";

            setFeedback((current) => ({
                kind: "error",
                message: mensaje,
                revision: current.revision + 1,
            }));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSubmittedEmail("");
        setSuccessMessage("");
        setErrors({});
        setFeedback(initialFeedback);
    };

    return {
        handleChange,
        handleSubmit,
        resetForm,
        formData,
        errors,
        feedback,
        loading,
        submittedEmail,
        successMessage,
    };
};
