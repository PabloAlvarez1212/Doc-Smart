"use client";

import { CalendarClock, CircleCheck, CircleX, ClipboardCheck, SearchX } from "lucide-react";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import AppointmentCard, { AppointmentListHeader } from "../../../ui/AppointmentCard/AppointmentCard";
import { getDoctorAppointmentActionKeys } from "../appointmentActions";
import styles from "./DoctorAppointmentList.module.css";

function capitalize(value) {
    const text = String(value || "").trim();
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "Sin estado";
}

export default function DoctorAppointmentList({
    citas = [],
    hasActiveFilters = false,
    cancelarCita,
    confirmarCita,
    completarCita,
    reprogramarCita,
}) {
    if (!citas.length) return <EmptyAppointments filtered={hasActiveFilters} />;

    return (
        <div className={styles.list}>
            <AppointmentListHeader personLabel="Paciente" />
            <div role="list">
                {citas.map((cita) => {
                    const status = String(cita.estado || "").toLowerCase();
                    const { fecha, hora } = formatearFecha(cita.fecha_programada);
                    const location = [cita.ciudad, cita.departamento].filter(Boolean).join(", ");
                    const resolutionDate = status === "cancelada"
                        ? cita.fecha_cancelacion
                        : status === "completada" ? cita.fecha_final : null;
                    const resolution = resolutionDate ? formatearFecha(resolutionDate) : null;
                    const actionMap = {
                        reprogramar: {
                            label: "Reprogramar",
                            icon: CalendarClock,
                            tone: "secondary",
                            onClick: () => reprogramarCita?.(cita),
                        },
                        cancelar: {
                            label: "Cancelar",
                            icon: CircleX,
                            tone: "danger",
                            onClick: () => cancelarCita?.(cita.id),
                        },
                        confirmar: {
                            label: "Confirmar",
                            icon: CircleCheck,
                            tone: "primary",
                            onClick: () => confirmarCita?.(cita.id),
                        },
                        completar: {
                            label: "Completar",
                            icon: ClipboardCheck,
                            tone: "success",
                            onClick: () => completarCita?.(cita.id),
                        },
                    };
                    const actions = getDoctorAppointmentActionKeys(status).map((id) => ({ id, ...actionMap[id] }));

                    return (
                        <AppointmentCard
                            key={cita.id}
                            date={fecha}
                            time={hora}
                            person={{
                                name: cita.paciente || "Paciente de DocSmart",
                                image: cita.foto_paciente,
                                secondary: cita.especialidad || null,
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
                <h3>{filtered ? "No hay citas con estos filtros" : "No tienes citas programadas"}</h3>
                <p>{filtered
                    ? "Prueba otro estado, paciente o fecha para ampliar los resultados."
                    : "Las nuevas solicitudes y consultas confirmadas aparecerán en esta agenda."}</p>
            </div>
        </div>
    );
}
