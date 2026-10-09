"use client";

import { useEffect, useState } from "react";
import {
    CalendarClock, CircleCheck, CircleX, ClipboardCheck, SearchX,
} from "lucide-react";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import { obtenerInfoPacienteCita } from "@/app/services/api";
import AppointmentCard, {
    AppointmentListHeader,
} from "../../../ui/AppointmentCard/AppointmentCard";
import Modal from "../../../ui/Modal/Modal";
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
    const [citaAbierta, setCitaAbierta] = useState(null);
    const citaVisible = citas.find(
        (cita) => cita.id === citaAbierta &&
            String(cita.estado || "").trim().toLowerCase() === "confirmada"
    );

    if (!citas.length) return <EmptyAppointments filtered={hasActiveFilters} />;

    return (
        <div className={styles.list}>
            <AppointmentListHeader personLabel="Paciente" />

            <div role="list">
                {citas.map((cita) => {
                    const status = String(cita.estado || "").trim().toLowerCase();
                    const abierta = citaVisible?.id === cita.id;
                    const { fecha, hora } = formatearFecha(cita.fecha_programada);
                    const location = [cita.ciudad, cita.departamento]
                        .filter(Boolean).join(", ");
                    const resolutionDate = status === "cancelada"
                        ? cita.fecha_cancelacion
                        : status === "completada" ? cita.fecha_final : null;
                    const resolution = resolutionDate
                        ? formatearFecha(resolutionDate) : null;

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

                    const actions = getDoctorAppointmentActionKeys(status)
                        .map((id) => ({ id, ...actionMap[id] }));

                    return (
                        <AppointmentCard
                            key={cita.id}
                            date={fecha}
                            time={hora}
                            person={{
                                name: cita.paciente || "Paciente de DocSmart",
                                image: cita.foto_paciente,
                                secondary: cita.especialidad || null,
                                infoAbierta: abierta,
                                infoPanelId: `info-medica-${cita.id}`,
                                onVerInfo: status === "confirmada"
                                    ? () => setCitaAbierta(cita.id)
                                    : undefined,
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

            <Modal
                abierto={Boolean(citaVisible)}
                onCerrar={() => setCitaAbierta(null)}
                titulo="Información médica del paciente"
                text={citaVisible?.paciente || ""}
                width="800px"
            >
                {citaVisible && (
                    <InfoMedicaCard
                        key={citaVisible.id}
                        citaId={citaVisible.id}
                        panelId={`info-medica-${citaVisible.id}`}
                    />
                )}
            </Modal>
        </div>
    );
}

function InfoMedicaCard({ citaId, panelId }) {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;
        setDatos(null);
        setError("");
        setCargando(true);

        obtenerInfoPacienteCita(citaId)
            .then((respuesta) => {
                if (activo) setDatos(respuesta);
            })
            .catch((e) => {
                if (activo) setError(
                    e.response?.data?.detail ||
                    "No pudimos cargar la información médica."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => { activo = false; };
    }, [citaId]);

    return (
        <section
            id={panelId}
            className={styles.medicalCard}
            aria-label="Información médica del paciente"
        >
            <p className={styles.medicalNote}>Reportada por el paciente.</p>

            {cargando && <p role="status">Cargando información…</p>}
            {error && <p role="alert">{error}</p>}

            {!cargando && !error && datos && (
                <>
                    <div className={styles.medicalMeasures}>
                        <span>Peso: {datos.paciente.peso != null
                            ? `${datos.paciente.peso} kg` : "Sin informar"}</span>
                        <span>Estatura: {datos.paciente.estatura != null
                            ? `${datos.paciente.estatura} m` : "Sin informar"}</span>
                    </div>

                    {!datos.informacion_salud.length && (
                        <p>El paciente aún no ha registrado antecedentes.</p>
                    )}

                    {datos.informacion_salud.map((dato) => (
                        <div key={dato.id} className={styles.medicalRecord}>
                            <small>{dato.tipo_nombre}</small>
                            <strong>{dato.nombre}</strong>
                            <span className={styles.medicalState}>
                                {capitalize(dato.estado)}
                            </span>

                            {dato.descripcion && <p>{dato.descripcion}</p>}
                            {dato.tipo_codigo === "alergia" && (
                                <p>Reacción: {dato.reaccion || "Sin informar"}</p>
                            )}
                            {dato.tipo_codigo === "medicamento" && (
                                <>
                                    <p>Dosis: {dato.dosis || "Sin informar"}</p>
                                    <p>Frecuencia: {dato.frecuencia || "Sin informar"}</p>
                                    <p>Vía: {dato.via_administracion || "Sin informar"}</p>
                                </>
                            )}
                            {dato.fecha_inicio && <p>Inicio: {dato.fecha_inicio}</p>}
                            {dato.fecha_fin && <p>Finalización: {dato.fecha_fin}</p>}
                            {dato.es_permanente && <p>Uso o condición permanente</p>}
                        </div>
                    ))}
                </>
            )}
        </section>
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