"use client";

import { CalendarDays, Clock3, Eye, MapPin, UserRoundSearch } from "lucide-react";
import ConsultorioLink from "../ConsultorioLink/ConsultorioLink";
import Image from "next/image";
import styles from "./AppointmentCard.module.css";

export default function AppointmentCard({
    date,
    time,
    person,
    location,
    status,
    actions = [],
    permitirMapa = false,
    onViewDetails,
    variant,
}) {
    const personName = person?.name || "Usuario de DocSmart";
    const statusKey = String(status?.key || "").toLowerCase();
    const statusBadge = <span className={`${styles.status} ${styles[statusKey] || ""}`}>{status?.label || "Sin estado"}</span>;
    const profileLink = person?.profileLink && (
        <button type="button" className={styles.profileLink} onClick={person.profileLink.onClick}
            aria-label={`${person.profileLink.label} de ${personName}`}>
            <UserRoundSearch size={15} aria-hidden="true" />
            <span>{person.profileLink.label}</span>
        </button>
    );
    const medicalInfo = person?.onVerInfo && (
        <button type="button" className={styles.medicalLink} onClick={person.onVerInfo}
            aria-expanded={person.infoAbierta} aria-controls={person.infoPanelId}>
            {person.infoAbierta ? 'Ocultar información médica' : variant === 'doctor' ? 'Información médica' : 'Presiona aquí para ver información médica'}
        </button>
    );
    const scheduleContent = (
<div className={styles.schedule}>
                    <span className={styles.dateIcon} aria-hidden="true">
                        <CalendarDays size={19} />
                    </span>

                    <div>
                        <strong>{date}</strong>
                        <span>
                            <Clock3 size={14} aria-hidden="true" />
                            {time}
                        </span>
                    </div>
                </div>
    );
    const personContent = (
<div className={styles.person}>
                    <Image
                        src={person?.image || "/images/foto_default.png"}
                        alt={`Foto de ${personName}`}
                        width={52}
                        height={52}
                    />

                    <div>
                        <strong>{personName}</strong>

                        {person?.secondary && (
                            <span>{person.secondary}</span>
                        )}

                        {/* Información médica: cambio proveniente de main */}
                        {variant !== 'doctor' && medicalInfo}
                    </div>
                    {variant === 'doctor' && <div className={styles.statusBlock}>{statusBadge}</div>}
                </div>
    );
    return (
        <article className={`${styles.item} ${variant === 'doctor' ? styles.doctor : variant === 'patient' ? styles.patient : ''}`} role="listitem">
            <header className={styles.cardHeader}>
                {variant === 'patient' ? personContent : scheduleContent}

                {variant !== 'doctor' && <div className={styles.statusBlock}>{statusBadge}</div>}
            </header>

            <div className={styles.cardBody}>
                {variant === 'patient' ? scheduleContent : personContent}

                <div className={styles.locationGroup}>
                    {variant !== 'patient' && profileLink}

                    <div className={styles.location}>
                        <MapPin size={18} aria-hidden="true" />

                        <div>
                            {!(variant === 'patient' && permitirMapa && location?.address) && <strong>
                                {location?.name || "Ubicación no disponible"}
                            </strong>}

                            {permitirMapa ? (
                                <ConsultorioLink
                                    direccion={location?.address}
                                    latitud={location?.latitud}
                                    longitud={location?.longitud}
                                    compact={variant === 'patient'}
                                    ciudad={location?.name}
                                />
                            ) : (
                                <span>
                                    {location?.address || "Ubicación no disponible"}
                                </span>
                            )}
                        </div>
                    </div>
                    {variant === 'patient' && profileLink}
                    {variant === 'doctor' && medicalInfo}
                </div>
            </div>

            <footer className={styles.actions} data-action-count={actions.length}>
                <div className={styles.controlGroup} data-control-count={actions.length + (onViewDetails ? 1 : 0)}>
                {/* Botón Ver detalles*/}
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

                {/* Acciones de la cita */}
                {actions.length > 0 && (
                    <div
                        className={styles.actionButtons}
                        data-action-count={actions.length}
                    >
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
                                className={`${styles.actionButton} ${styles[tone] || styles.secondary
                                    }`}
                                data-tone={tone}
                                onClick={onClick}
                                disabled={disabled || loading}
                                aria-busy={loading || undefined}
                            >
                                {Icon && (
                                    <Icon size={15} aria-hidden="true" />
                                )}

                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                )}
                
                </div>

            </footer>
        </article>
    );
}
