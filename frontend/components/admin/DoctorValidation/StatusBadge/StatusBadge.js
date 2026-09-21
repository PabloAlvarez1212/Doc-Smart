import { BadgeCheck, Clock3, CircleX } from "lucide-react";
import styles from "./StatusBadge.module.css";

const statusConfig = {
    pendiente: { label: "Pendiente", icon: Clock3 },
    aprobado: { label: "Aprobado", icon: BadgeCheck },
    rechazado: { label: "Rechazado", icon: CircleX },
};

export default function StatusBadge({ status = "pendiente", showIcon = true }) {
    const normalizedStatus = String(status).toLowerCase();
    const config = statusConfig[normalizedStatus] ?? { label: "Sin estado", icon: Clock3 };
    const Icon = config.icon;

    return (
        <span className={`${styles.badge} ${styles[normalizedStatus] ?? styles.unknown}`}>
            {showIcon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
            {config.label}
        </span>
    );
}
