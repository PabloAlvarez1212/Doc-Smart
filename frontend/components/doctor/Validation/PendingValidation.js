import { Clock3, Mail } from "lucide-react";
import ValidationDate from "./ValidationDate";
import styles from "./Validation.module.css";

export default function PendingValidation({ validacion }) {
    return (
        <>
            <div className={`${styles.statusIcon} ${styles.pending}`}><Clock3 size={28} aria-hidden="true" /></div>
            <span className={`${styles.badge} ${styles.pending}`}>En revisión</span>
            <h1>Tu solicitud está en revisión</h1>
            <p className={styles.description}>Recibimos tu información y documentación. El equipo de DocSmart está verificando tus datos profesionales antes de habilitar tu acceso al panel médico.</p>
            {validacion.fecha_solicitud && (
                <dl className={styles.dates}><ValidationDate label="Solicitud enviada el" value={validacion.fecha_solicitud} /></dl>
            )}
            <div className={styles.notice}>
                <Mail size={20} aria-hidden="true" />
                <p>Te notificaremos por correo cuando tu solicitud sea revisada.</p>
            </div>
        </>
    );
}
