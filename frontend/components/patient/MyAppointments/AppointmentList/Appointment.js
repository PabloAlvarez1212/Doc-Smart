"use client";

import { SearchX, X } from "lucide-react";
import Link from "next/link";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import AppointmentCard, { AppointmentListHeader } from "../../../ui/AppointmentCard/AppointmentCard";
import styles from "./Appointment.module.css";

const cancellableStatuses = new Set(["pendiente", "confirmada", "reprogramada"]);

function capitalize(value) {
    const text = String(value || "").trim();
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "Sin estado";
}

export default function AppointmentList({ citas = [], cancelarCita, hasActiveFilters = false }) {
    if (!citas.length) return <EmptyAppointments filtered={hasActiveFilters} />;

    return (
        <div className={styles.list}>
            <AppointmentListHeader personLabel="Profesional" />
            <div role="list">
                {citas.map((cita) => {
                    const status = String(cita.estado || "").toLowerCase();
                    const { fecha, hora } = formatearFecha(cita.fecha_programada);
                    const location = [cita.ciudad, cita.departamento].filter(Boolean).join(", ");
                    const resolutionDate = status === "cancelada"
                        ? cita.fecha_cancelacion
                        : status === "completada" ? cita.fecha_final : null;
                    const resolution = resolutionDate ? formatearFecha(resolutionDate) : null;
                    const actions = cancellableStatuses.has(status)
                        ? [{
                            id: "cancelar",
                            label: "Cancelar cita",
                            icon: X,
                            tone: "danger",
                            onClick: () => cancelarCita?.(cita.id),
                        }]
                        : [];

                    return (
                        <AppointmentCard
                            key={cita.id}
                            date={fecha}
                            time={hora}
                            person={{
                                name: cita.medico || "Profesional de DocSmart",
                                image: cita.foto_medico,
                                secondary: cita.especialidad || "Especialidad no disponible",
                            }}
                            location={{ name: location, address: cita.direccion }}
                            status={{ key: status, label: capitalize(cita.estado) }}
                            actions={actions}
                            metadata={resolution
                                ? `${status === "cancelada" ? "Cancelada" : "Completada"} el ${resolution.fecha}, ${resolution.hora}`
                                : null}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function EmptyAppointments({ filtered }) {
    return (
        <div className={styles.empty}>
            <span aria-hidden="true"><SearchX size={24} /></span>
            <div>
                <h3>{filtered ? "No hay citas con estos filtros" : "Aún no tienes citas"}</h3>
                <p>{filtered
                    ? "Prueba otra combinación de estado, profesional, ubicación o fecha."
                    : "Cuando programes una consulta, podrás revisarla y gestionarla desde aquí."}</p>
            </div>
            {!filtered && <Link href="/patient/find-doctors">Encontrar un doctor</Link>}
        </div>
    );
}
