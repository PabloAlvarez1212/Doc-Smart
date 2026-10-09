"use client";

import { CalendarDays, CalendarX, CheckCircle2, Clock3, Eye, MapPin } from "lucide-react";
import Image from "next/image";
import styles from "./AppointmentCard.module.css";

export default function AppointmentCard({
    date,
    time,
    person,
    location,
    status,
    actions = [],
    metadata,
    onViewDetails,
}) {
    const personName = person?.name || "Usuario de DocSmart";
    const statusKey = String(status?.key || "").toLowerCase();
    const ResolutionIcon = statusKey === "completada"
        ? CheckCircle2
        : statusKey === "cancelada" ? CalendarX : null;

    return (
        <article className={styles.item} role="listitem">
            <header className={styles.cardHeader}>
                <div className={styles.schedule}>
                    <span className={styles.dateIcon} aria-hidden="true">
                        <CalendarDays size={19} />
                    </span>
                    <div>
                        <strong>{date}</strong>
                        <span><Clock3 size={14} aria-hidden="true" />{time}</span>
                    </div>
                </div>

                <div className={styles.statusBlock}>
                    <span className={`${styles.status} ${styles[statusKey] || ""}`}>
                        {status?.label || "Sin estado"}
                    </span>
                </div>
            </header>

            <div className={styles.cardBody}>
                <div className={styles.person}>
                    <Image
                        src={person?.image || "/images/foto_default.png"}
                        alt={`Foto de ${personName}`}
                        width={52}
                        height={52}
                    />
                    <div>
                        <strong>{personName}</strong>
                        {person?.secondary && <span>{person.secondary}</span>}
                    </div>
                </div>

                <div className={styles.location}>
                    <MapPin size={18} aria-hidden="true" />
                    <div>
                        <strong>{location?.name || "Ubicación no disponible"}</strong>
                        <span>{location?.address || "Dirección no disponible"}</span>
                    </div>
                </div>
            </div>

            <footer className={styles.actions}>
                {onViewDetails && (
                    <button
                        type="button"
                        className={styles.detailsButton}
                        onClick={onViewDetails}
                        aria-label={`Ver detalles de la cita con ${personName}`}
                    >
                        <Eye size={14} aria-hidden="true" />
                        <span>Ver detalles</span>
                    </button>
                )}

                {metadata && ResolutionIcon && (
                    <div className={`${styles.resolutionInfo} ${statusKey === "completada"
                        ? styles.resolutionCompleted
                        : styles.resolutionCancelled}`}
                    >
                        <ResolutionIcon size={15} aria-hidden="true" />
                        <span>{metadata}</span>
                    </div>
                )}

                {actions.length > 0 && (
                    <div className={styles.actionButtons} data-action-count={actions.length}>
                        {actions.map(({
                            id,
                            label,
                            icon: Icon,
                            tone = "secondary",
                            onClick,
                            disabled = false,
                            loading = false,
                        }) => (
                            <button
                                key={id}
                                type="button"
                                className={`${styles.actionButton} ${styles[tone] || styles.secondary}`}
                                data-tone={tone}
                                onClick={onClick}
                                disabled={disabled || loading}
                                aria-busy={loading || undefined}
                            >
                                {Icon && <Icon size={15} aria-hidden="true" />}
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </footer>
        </article>
    );
}
