"use client";

import { CalendarClock, CircleX, SearchX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import AppointmentCard, { AppointmentListHeader } from "../../../ui/AppointmentCard/AppointmentCard";
import AppointmentDetailsModal from "../../../ui/AppointmentDetailsModal/AppointmentDetailsModal";
import { getPatientAppointmentActionKeys } from "../../../ui/AppointmentCard/appointmentViewState";
import styles from "./Appointment.module.css";

function capitalize(value) {
    const text = String(value || "").trim();
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "Sin estado";
}

export default function AppointmentList({
    citas = [],
    cancelarCita,
    reprogramarCita,
    hasActiveFilters = false,
}) {
    const [detailsAppointment, setDetailsAppointment] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    if (!citas.length) return <EmptyAppointments filtered={hasActiveFilters} />;

    const openDetails = (appointment) => {
        setDetailsAppointment(appointment);
        setDetailsOpen(true);
    };

    return (
        <>
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
                    const actionKeys = getPatientAppointmentActionKeys(status);
                    const actions = actionKeys.map((action) => action === "reprogramar"
                        ? {
                            id: "reprogramar",
                            label: "Reprogramar",
                            icon: CalendarClock,
                            tone: "secondary",
                            onClick: () => reprogramarCita?.(cita),
                        }
                        : {
                            id: "cancelar",
                            label: "Cancelar cita",
                            icon: CircleX,
                            tone: "danger",
                            onClick: () => cancelarCita?.(cita.id),
                        });

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
                            onViewDetails={() => openDetails(cita)}
                            metadata={resolution
                                ? `${status === "cancelada" ? "Cancelada" : "Completada"} el ${resolution.fecha}, ${resolution.hora}`
                                : null}
                        />
                    );
                    })}
                </div>
            </div>
            <AppointmentDetailsModal
                abierto={detailsOpen}
                onCerrar={() => setDetailsOpen(false)}
                onExitComplete={() => setDetailsAppointment(null)}
                cita={detailsAppointment}
                counterpart="medico"
            />
        </>
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
