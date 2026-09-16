import { BadgeCheck, Clock3, CircleX } from "lucide-react";
import styles from "./ValidationSummary.module.css";

const states = [
    { key: "pendientes", label: "Pendientes", description: "En espera de revisión", icon: Clock3, tone: "pending" },
    { key: "aprobados", label: "Aprobadas", description: "Validación completada", icon: BadgeCheck, tone: "approved" },
    { key: "rechazados", label: "Rechazadas", description: "Solicitudes no habilitadas", icon: CircleX, tone: "rejected" },
];

export default function ValidationSummary({ metricas }) {
    return (
        <section
            className={styles.grid}
            aria-label="Resumen de estados de validación"
        >
            {states.map(({ key, label, description, icon: Icon, tone }) => {

                const count = metricas?.[key] ?? 0;

                return (
                    <article
                        className={`${styles.item} ${styles[tone]}`}
                        key={key}
                    >
                        <span
                            className={styles.icon}
                            aria-hidden="true"
                        >
                            <Icon size={18} />
                        </span>

                        <span className={styles.copy}>
                            <strong>{label}</strong>
                            <small>{description}</small>
                        </span>

                        <span
                            className={styles.count}
                            aria-label={`${count} ${count === 1 ? "médico" : "médicos"
                                } ${label.toLowerCase()}`}
                        >
                            {count}
                        </span>
                    </article>
                );
            })}
        </section>
    );
}