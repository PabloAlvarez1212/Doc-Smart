"use client";

import { CalendarDays, Clock3, MapPin } from "lucide-react";
import Image from "next/image";
import styles from "./AppointmentCard.module.css";

export function AppointmentListHeader({ personLabel }) {
    return (
        <div className={styles.listHeader} aria-hidden="true">
            <span>Fecha y hora</span>
            <span>{personLabel}</span>
            <span>Ubicación</span>
            <span>Estado y acciones</span>
        </div>
    );
}

export default function AppointmentCard({
    date,
    time,
    person,
    location,
    status,
    actions = [],
    metadata,
}) {
    const personName = person?.name || "Usuario de DocSmart";
    const statusKey = String(status?.key || "").toLowerCase();

    return (
        <article className={styles.item} role="listitem">
            <div className={styles.schedule}>
                <span className={styles.dateIcon} aria-hidden="true"><CalendarDays size={19} /></span>
                <div>
                    <strong>{date}</strong>
                    <span><Clock3 size={14} aria-hidden="true" />{time}</span>
                </div>
            </div>

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
                    {person?.onVerInfo && (
                        <button
                            type="button"
                            className={styles.medicalLink}
                            onClick={person.onVerInfo}
                            aria-expanded={person.infoAbierta}
                            aria-controls={person.infoPanelId}
                        >
                            {person.infoAbierta
                                ? "Ocultar información médica"
                                : "Presiona aquí para ver información médica"}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.location}>
                <MapPin size={18} aria-hidden="true" />
                <div>
                    <strong>{location?.name || "Ubicación no disponible"}</strong>
                    <span>{location?.address || "Dirección no disponible"}</span>
                </div>
            </div>

            <div className={styles.actions}>
                <span className={`${styles.status} ${styles[statusKey] || ""}`}>
                    {status?.label || "Sin estado"}
                </span>
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
                {metadata && <small>{metadata}</small>}
            </div>
        </article>
    );
}
