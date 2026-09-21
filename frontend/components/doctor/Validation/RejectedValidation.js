"use client";

import { useState } from "react";
import { CalendarDays, CircleX, FileText, FileUp, RefreshCw } from "lucide-react";
import Button from "../../ui/Button/Button";
import ValidationDate from "./ValidationDate";
import styles from "./Validation.module.css";

export default function RejectedValidation({
    validacion,
    enviarNuevaSolicitud,
    enviandoSolicitud = false,
    errorEnvio,
}) {
    const [archivo, setArchivo] = useState(null);
    const puedeReintentar = validacion.puede_reintentar === true;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!puedeReintentar || enviandoSolicitud || !archivo) return;

        const enviado = await enviarNuevaSolicitud(archivo);
        if (enviado) setArchivo(null);
    };

    return (
        <>
            <div className={`${styles.statusIcon} ${styles.rejected}`}><CircleX size={28} aria-hidden="true" /></div>
            <span className={`${styles.badge} ${styles.rejected}`}>Solicitud rechazada</span>
            <h1>Tu solicitud no pudo ser aprobada</h1>
            <p className={styles.description}>Consulta el motivo de la revisión y la fecha a partir de la cual podrás volver a presentar tu documentación.</p>
            <section className={styles.reason} aria-labelledby="rejection-reason-title">
                <h2 id="rejection-reason-title">Motivo del rechazo</h2>
                <p>{validacion.motivo_rechazo?.trim() || "No se registró un motivo de rechazo."}</p>
            </section>
            <dl className={styles.dates}>
                <ValidationDate label="Revisada el" value={validacion.fecha_revision} />
                <ValidationDate label="Puedes volver a solicitar desde" value={validacion.puede_reintentar_desde} />
            </dl>
            <div className={styles.notice}>
                <CalendarDays size={20} aria-hidden="true" />
                <p>{puedeReintentar
                    ? "El plazo de espera ha finalizado. Puedes enviar una nueva hoja de vida para revisión."
                    : validacion.puede_reintentar_desde
                        ? "Todavía debes esperar hasta la fecha indicada para volver a enviar tu documentación."
                        : "Por ahora debes esperar. La fecha para volver a enviar tu documentación todavía no está disponible."}</p>
            </div>

            {puedeReintentar && (
                <form className={styles.retryRequest} onSubmit={handleSubmit}>
                    <div className={styles.retryHeading}>
                        <div>
                            <h2>Enviar nueva solicitud</h2>
                            <p>Adjunta una hoja de vida actualizada en formato PDF, máximo 5 MB.</p>
                        </div>
                    </div>

                    <input
                        id="retry-resume"
                        className={styles.fileInput}
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={enviandoSolicitud}
                        onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
                        aria-describedby="retry-resume-help"
                    />

                    <div className={`${styles.filePicker} ${archivo ? styles.fileSelected : ""}`}>
                        <span className={styles.filePickerIcon} aria-hidden="true">
                            {archivo ? <FileText size={22} /> : <FileUp size={22} />}
                        </span>
                        <div className={styles.filePickerCopy}>
                            <strong title={archivo?.name}>{archivo?.name || "Selecciona tu nueva hoja de vida"}</strong>
                            <span id="retry-resume-help">{archivo ? "PDF seleccionado" : "Solo archivos PDF de hasta 5 MB"}</span>
                        </div>
                        <label className={styles.filePickerAction} htmlFor="retry-resume" aria-disabled={enviandoSolicitud}>
                            <RefreshCw size={15} aria-hidden="true" />
                            {archivo ? "Cambiar PDF" : "Seleccionar PDF"}
                        </label>
                    </div>

                    {errorEnvio && <p className={styles.retryError} role="alert">{errorEnvio}</p>}

                    <Button
                        type="submit"
                        className={styles.action}
                        disabled={!archivo || enviandoSolicitud}
                        loading={enviandoSolicitud}
                    >
                        {enviandoSolicitud ? "Enviando solicitud..." : "Enviar nueva solicitud"}
                    </Button>
                </form>
            )}
        </>
    );
}
