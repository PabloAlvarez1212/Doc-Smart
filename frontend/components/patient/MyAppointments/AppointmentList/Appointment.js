"use client";

import { CalendarDays, Clock3, MapPin, SearchX, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import styles from "./Appointment.module.css";

const cancellableStatuses = new Set(["pendiente", "confirmada", "reprogramada"]);

function capitalize(value) {
    const text = String(value || "").trim();
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "Sin estado";
}

export default function AppointmentList({ citas = [], cancelarCita, hasActiveFilters = false }) {
    if (!citas.length) {
        return <EmptyAppointments filtered={hasActiveFilters} />;
    }

    return (
        <div className={styles.list}>
            <div className={styles.listHeader} aria-hidden="true">
                <span>Fecha y hora</span>
                <span>Profesional</span>
                <span>Ubicación</span>
                <span>Estado y acciones</span>
            </div>
            <div role="list">
                {citas.map((cita) => (
                    <AppointmentItem key={cita.id} cita={cita} cancelarCita={cancelarCita} />
                ))}
            </div>
        </div>
    );
}

function AppointmentItem({ cita, cancelarCita }) {
    const { fecha, hora } = formatearFecha(cita.fecha_programada);
    const status = String(cita.estado || "").toLowerCase();
    const location = [cita.ciudad, cita.departamento].filter(Boolean).join(", ");
    const resolutionDate = status === "cancelada"
        ? cita.fecha_cancelacion
        : status === "completada" ? cita.fecha_final : null;
    const resolution = resolutionDate ? formatearFecha(resolutionDate) : null;

    return (
        <article className={styles.item} role="listitem">
            <div className={styles.schedule}>
                <span className={styles.dateIcon} aria-hidden="true"><CalendarDays size={19} /></span>
                <div>
                    <strong>{fecha}</strong>
                    <span><Clock3 size={14} aria-hidden="true" />{hora}</span>
                </div>
            </div>

            <div className={styles.doctor}>
                <Image
                    src={cita.foto_medico || "/images/foto_default.png"}
                    alt={`Foto de ${cita.medico || "médico"}`}
                    width={52}
                    height={52}
                />
                <div>
                    <strong>{cita.medico || "Profesional de DocSmart"}</strong>
                    <span>{cita.especialidad || "Especialidad no disponible"}</span>
                </div>
            </div>

            <div className={styles.location}>
                <MapPin size={18} aria-hidden="true" />
                <div>
                    <strong>{location || "Ubicación no disponible"}</strong>
                    <span>{cita.direccion || "Dirección no disponible"}</span>
                </div>
            </div>

            <div className={styles.actions}>
                <span className={`${styles.status} ${styles[status] || ""}`}>{capitalize(cita.estado)}</span>
                {cancellableStatuses.has(status) && (
                    <button type="button" onClick={() => cancelarCita?.(cita.id)}>
                        <X size={15} aria-hidden="true" /> Cancelar cita
                    </button>
                )}
                {resolution && (
                    <small>
                        {status === "cancelada" ? "Cancelada" : "Completada"} el {resolution.fecha}, {resolution.hora}
                    </small>
                )}
            </div>
        </article>
    );
}

function EmptyAppointments({ filtered }) {
    return (
        <div className={styles.empty}>
            <span aria-hidden="true"><SearchX size={24} /></span>
            <div>
                <h3>{filtered ? "No hay citas con estos filtros" : "Aún no tienes citas"}</h3>
                <p>
                    {filtered
                        ? "Prueba otra combinación de estado, profesional, ubicación o fecha."
                        : "Cuando programes una consulta, podrás revisarla y gestionarla desde aquí."}
                </p>
            </div>
            {!filtered && <Link href="/patient/find-doctors">Encontrar un doctor</Link>}
        </div>
    );
}
