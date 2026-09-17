import { CircleX, CalendarDays } from "lucide-react";
import Button from "../../ui/Button/Button";
import ValidationDate from "./ValidationDate";
import styles from "./Validation.module.css";

export default function RejectedValidation({ validacion }) {
    const puedeReintentar = validacion.puede_reintentar === true;

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
                    ? "El plazo de espera ha finalizado. Puedes preparar tu documentación para una nueva revisión."
                    : validacion.puede_reintentar_desde
                        ? "Todavía debes esperar hasta la fecha indicada para volver a enviar tu documentación."
                        : "Por ahora debes esperar. La fecha para volver a enviar tu documentación todavía no está disponible."}</p>
            </div>
            {puedeReintentar && (
                <div className={styles.retryRequest}>
                    <Button disabled aria-describedby="new-request-help" className={styles.action}>Enviar nueva solicitud</Button>
                    <p id="new-request-help">El envío de nuevas solicitudes estará disponible próximamente.</p>
                </div>
            )}
        </>
    );
}
