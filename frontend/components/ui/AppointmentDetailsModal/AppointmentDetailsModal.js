"use client";

import {
    CalendarDays,
    Check,
    Clock3,
    Copy,
    MapPin,
    MessageSquareText,
    Stethoscope,
    TicketCheck,
    UserRound,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import { copyAppointmentCode } from "../AppointmentCard/appointmentDetails";
import Modal from "../Modal/Modal";
import { getAppointmentDetailsData } from "./appointmentDetailsModalData";
import styles from "./AppointmentDetailsModal.module.css";

function capitalize(value) {
    const text = String(value || "").trim();
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "Sin estado";
}

export default function AppointmentDetailsModal({
    abierto,
    onCerrar,
    onExitComplete,
    cita,
    counterpart = "medico",
}) {
    const data = getAppointmentDetailsData(cita, counterpart);
    const scheduled = data.scheduledAt ? formatearFecha(data.scheduledAt) : null;
    const statusKey = data.status.toLowerCase();
    const PersonIcon = counterpart === "paciente" ? UserRound : Stethoscope;

    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            onExitComplete={onExitComplete}
            titulo="Detalles de la cita"
            text="Consulta la información completa de esta atención."
            headerVariant="white"
            width="720px"
            icon={<span className={styles.headerIcon} aria-hidden="true"><CalendarDays size={22} /></span>}
        >
            <div className={styles.content}>
                <div className={styles.summary}>
                    <div>
                        <span className={styles.summaryLabel}>Estado actual</span>
                        <span className={`${styles.status} ${styles[statusKey] || ""}`}>
                            {capitalize(data.status)}
                        </span>
                    </div>
                    <p>Información de solo lectura</p>
                </div>

                <section className={styles.section} aria-labelledby="appointment-identification-title">
                    <SectionTitle
                        id="appointment-identification-title"
                        icon={TicketCheck}
                        title="Información de la cita"
                    />
                    <AppointmentCode value={data.code} appointmentId={data.id} />
                    <div className={styles.dataGrid}>
                        <DetailItem icon={CalendarDays} label="Fecha programada" value={scheduled?.fecha || "No disponible"} />
                        <DetailItem icon={Clock3} label="Hora programada" value={scheduled?.hora || "No disponible"} />
                    </div>
                </section>

                <section className={styles.section} aria-labelledby="appointment-person-title">
                    <SectionTitle
                        id="appointment-person-title"
                        icon={PersonIcon}
                        title={data.person.label}
                    />
                    <div className={styles.person}>
                        <Image
                            src={data.person.image || "/images/foto_default.png"}
                            alt={`Foto de ${data.person.name}`}
                            width={52}
                            height={52}
                        />
                        <div>
                            <strong>{data.person.name}</strong>
                            {data.person.specialty && <span>{data.person.specialty}</span>}
                        </div>
                    </div>
                </section>

                <section className={styles.section} aria-labelledby="appointment-location-title">
                    <SectionTitle id="appointment-location-title" icon={MapPin} title="Ubicación" />
                    <div className={styles.dataGrid}>
                        <DetailItem label="Ciudad" value={data.location.city || "No disponible"} />
                        <DetailItem label="Departamento" value={data.location.department || "No disponible"} />
                        <DetailItem
                            className={styles.fullWidth}
                            label="Dirección del consultorio"
                            value={data.location.address || "No disponible"}
                        />
                    </div>
                </section>

                <section className={styles.section} aria-labelledby="appointment-reason-title">
                    <SectionTitle
                        id="appointment-reason-title"
                        icon={MessageSquareText}
                        title="Motivo de consulta"
                    />
                    <p className={`${styles.reason} ${!data.reason ? styles.emptyValue : ""}`}>
                        {data.reason || "Sin motivo de consulta registrado"}
                    </p>
                </section>
            </div>
        </Modal>
    );
}

function SectionTitle({ id, icon: Icon, title }) {
    return (
        <h3 id={id} className={styles.sectionTitle}>
            <Icon size={17} aria-hidden="true" />
            {title}
        </h3>
    );
}

function DetailItem({ icon: Icon, label, value, className = "" }) {
    return (
        <div className={`${styles.detailItem} ${className}`}>
            <span>{Icon && <Icon size={15} aria-hidden="true" />}{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function AppointmentCode({ value, appointmentId }) {
    const timeoutRef = useRef(null);
    const [copyState, setCopyState] = useState("idle");

    useEffect(() => {
        setCopyState("idle");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, [appointmentId]);

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const handleCopy = async () => {
        const copied = await copyAppointmentCode(value);
        setCopyState(copied ? "copied" : "error");
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopyState("idle"), 2400);
    };

    const label = copyState === "copied" ? "Copiado" : copyState === "error" ? "Reintentar" : "Copiar";
    const feedback = copyState === "copied"
        ? "Código de cita copiado"
        : copyState === "error" ? "No se pudo copiar el código de cita" : "";

    return (
        <div className={styles.codeBlock}>
            <span>Código único</span>
            <div className={styles.codeRow}>
                <code className={!value ? styles.emptyCode : ""}>{value || "Código no disponible"}</code>
                {value && (
                    <button
                        type="button"
                        className={styles.copyButton}
                        data-state={copyState}
                        onClick={handleCopy}
                        aria-label={`Copiar código de cita ${value}`}
                    >
                        {copyState === "copied"
                            ? <Check size={15} aria-hidden="true" />
                            : <Copy size={15} aria-hidden="true" />}
                        {label}
                    </button>
                )}
            </div>
            <span className={styles.srOnly} role="status" aria-live="polite">{feedback}</span>
        </div>
    );
}
