"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyAppointmentCode, getAppointmentCode } from "../AppointmentCard/appointmentDetails";
import styles from "./AppointmentCode.module.css";

export default function AppointmentCode({ value, contextId, compact = false }) {
    const timeoutRef = useRef(null);
    const [copyState, setCopyState] = useState("idle");
    const code = getAppointmentCode(value);

    useEffect(() => {
        setCopyState("idle");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, [contextId, code]);

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const handleCopy = async () => {
        const copied = await copyAppointmentCode(code);
        setCopyState(copied ? "copied" : "error");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopyState("idle"), 2400);
    };

    const buttonLabel = copyState === "copied"
        ? "Copiado"
        : copyState === "error" ? "Reintentar" : "Copiar";
    const feedback = copyState === "copied"
        ? "Código de cita copiado"
        : copyState === "error" ? "No se pudo copiar el código de cita" : "";

    return (
        <div className={`${styles.codeBlock} ${compact ? styles.compact : ""}`}>
            <span className={styles.label}>Código de cita</span>
            <div className={styles.codeRow}>
                <code className={!code ? styles.emptyCode : ""}>
                    {code || "Código no disponible"}
                </code>
                {code && (
                    <button
                        type="button"
                        className={styles.copyButton}
                        data-state={copyState}
                        onClick={handleCopy}
                        aria-label={`Copiar código de cita ${code}`}
                    >
                        {copyState === "copied"
                            ? <Check size={15} aria-hidden="true" />
                            : <Copy size={15} aria-hidden="true" />}
                        <span>{buttonLabel}</span>
                    </button>
                )}
            </div>
            <span className={styles.srOnly} role="status" aria-live="polite">
                {feedback}
            </span>
        </div>
    );
}
