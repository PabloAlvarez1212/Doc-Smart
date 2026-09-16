"use client";

import { useEffect, useState } from "react";
import { UserRoundX } from "lucide-react";
import Button from "../../../ui/Button/Button";
import Modal from "../../../ui/Modal/Modal";
import styles from "./RejectDoctorModal.module.css";

const MAX_REASON_LENGTH = 500;

function getDoctorName(request) {
    return request?.nombre_completo
        || [request?.nombre, request?.apellido].filter(Boolean).join(" ")
        || "Médico seleccionado";
}

export default function RejectDoctorModal({
    request,
    open = false,
    onClose = () => {},
    onConfirm,
}) {
    const [reason, setReason] = useState("");
    const trimmedReason = reason.trim();
    const canSubmit = request?.id != null && trimmedReason.length > 0 && Boolean(onConfirm);

    useEffect(() => {
        setReason("");
    }, [open, request?.id]);

    const handleClose = () => {
        setReason("");
        onClose();
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!canSubmit) return;

        onConfirm({
            solicitudId: request.id,
            motivo: trimmedReason,
        });
    };

    return (
        <Modal
            abierto={open && Boolean(request)}
            onCerrar={handleClose}
            titulo="Rechazar solicitud"
            headerVariant="white"
            width="560px"
            icon={<span className={styles.headerIcon} aria-hidden="true"><UserRoundX size={22} /></span>}
        >
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.introduction}>
                    <p>Especifica el motivo por el cual la solicitud del médico será rechazada.</p>
                    <div className={styles.doctor}>
                        <span>Solicitud seleccionada</span>
                        <strong>{getDoctorName(request)}</strong>
                    </div>
                </div>

                <div className={styles.field}>
                    <div className={styles.labelRow}>
                        <label htmlFor="doctor-rejection-reason">Motivo del rechazo</label>
                        <span aria-live="polite">{reason.length}/{MAX_REASON_LENGTH}</span>
                    </div>
                    <textarea
                        id="doctor-rejection-reason"
                        name="rejectionReason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Describe de forma clara el motivo del rechazo..."
                        maxLength={MAX_REASON_LENGTH}
                        rows={5}
                        required
                    />
                    <small>Este motivo deberá ser claro para la revisión administrativa posterior.</small>
                </div>

                <div className={styles.actions}>
                    <Button type="button" size="sm" variant="secundary" className={styles.cancelButton} onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" size="sm" variant="danger" className={styles.rejectButton} disabled={!canSubmit}>
                        Rechazar solicitud
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
