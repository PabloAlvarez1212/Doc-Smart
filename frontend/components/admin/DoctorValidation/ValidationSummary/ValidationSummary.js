import { BadgeCheck, Clock3, CircleX } from "lucide-react";
import styles from "./ValidationSummary.module.css";

const states = [
    { key: "pendiente", label: "Pendientes", description: "En espera de revisión", icon: Clock3, tone: "pending" },
    { key: "aprobado", label: "Aprobadas", description: "Validación completada", icon: BadgeCheck, tone: "approved" },
    { key: "rechazado", label: "Rechazadas", description: "Solicitudes no habilitadas", icon: CircleX, tone: "rejected" },
];

export default function ValidationSummary({ requests = [] }) {
    return (
        <section className={styles.grid} aria-label="Resumen de estados de validación">
            {states.map(({ key, label, description, icon: Icon, tone }) => {
                const count = requests.filter((request) => request.estado_validacion === key).length;

                return (
                    <article className={`${styles.item} ${styles[tone]}`} key={key}>
                        <span className={styles.icon} aria-hidden="true"><Icon size={18} /></span>
                        <span className={styles.copy}>
                            <strong>{label}</strong>
                            <small>{description}</small>
                        </span>
                        <span className={styles.count} aria-label={`${count} ${count === 1 ? "solicitud" : "solicitudes"} ${label.toLowerCase()}`}>{count}</span>
                    </article>
                );
            })}
        </section>
    );
}
