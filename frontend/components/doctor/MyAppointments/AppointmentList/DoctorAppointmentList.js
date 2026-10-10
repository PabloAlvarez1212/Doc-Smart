"use client";

import { useEffect, useState } from "react";

import {
    CalendarClock,
    CircleCheck,
    CircleX,
    ClipboardCheck,
    SearchX,
} from "lucide-react";

import formatearFecha, {
    formatearFechaResolucion,
} from "@/app/utils/fechaFormaterUtils";

import { obtenerInfoPacienteCita } from "@/app/services/api";

import AppointmentCard from "../../../ui/AppointmentCard/AppointmentCard";
import AppointmentDetailsModal from "../../../ui/AppointmentDetailsModal/AppointmentDetailsModal";
import Modal from "../../../ui/Modal/Modal";

import { getDoctorAppointmentActionKeys } from "../appointmentActions";

import styles from "./DoctorAppointmentList.module.css";


function capitalize(value) {
    const text = String(value || "").trim();

    return text
        ? `${text[0].toUpperCase()}${text.slice(1)}`
        : "Sin estado";
}


/**
 * Obtiene la fecha de resolución de una cita.
 *
 * - Cancelada: utiliza fecha_cancelacion.
 * - Completada: prioriza fecha_completada.
 * - Si fecha_completada no existe, utiliza fecha_final.
 *
 * Esto mantiene compatibilidad con ambas versiones del backend.
 */
function obtenerFechaResolucion(cita, status) {
    if (status === "cancelada") {
        return cita.fecha_cancelacion || null;
    }

    if (status === "completada") {
        return cita.fecha_completada || cita.fecha_final || null;
    }

    return null;
}


/**
 * Construye el texto que aparece debajo del botón
 * Ver detalles.
 */
function obtenerMetadata(cita, status) {
    if (status === "vencida") {
        return "El plazo de cierre de esta cita venció.";
    }

    const fechaResolucion = obtenerFechaResolucion(cita, status);

    if (!fechaResolucion) {
        return null;
    }

    const fechaFormateada = formatearFechaResolucion(fechaResolucion);

    if (!fechaFormateada) {
        return null;
    }

    if (status === "cancelada") {
        return `Cancelada el ${fechaFormateada}`;
    }

    if (status === "completada") {
        return `Completada el ${fechaFormateada}`;
    }

    return null;
}


export default function DoctorAppointmentList({
    citas = [],
    hasActiveFilters = false,
    cancelarCita,
    confirmarCita,
    completarCita,
    reprogramarCita,
}) {
    /*
     * Modal de detalles de la cita.
     */
    const [detailsAppointment, setDetailsAppointment] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    /*
     * Modal de información médica del paciente.
     *
     * Guarda el ID de la cita cuya información
     * médica se está consultando.
     */
    const [citaAbierta, setCitaAbierta] = useState(null);

    /*
     * Solo permitimos mostrar la información médica
     * cuando la cita está confirmada.
     */
    const citaVisible = citas.find((cita) => {
        const estado = String(cita.estado || "")
            .trim()
            .toLowerCase();

        return (
            cita.id === citaAbierta &&
            estado === "confirmada"
        );
    });

    /*
     * Abrir detalles de la cita.
     */
    const openDetails = (appointment) => {
        setDetailsAppointment(appointment);
        setDetailsOpen(true);
    };

    /*
     * Cerrar detalles de la cita.
     */
    const closeDetails = () => {
        setDetailsOpen(false);
    };

    /*
     * Abrir o cerrar información médica.
     */
    const toggleMedicalInfo = (citaId) => {
        setCitaAbierta((prev) =>
            prev === citaId ? null : citaId
        );
    };

    /*
     * Estado vacío.
     */
    if (!citas.length) {
        return (
            <EmptyAppointments
                filtered={hasActiveFilters}
            />
        );
    }

    return (
        <>
            {/* Lista de citas del médico */}
            <div className={styles.list}>
                <div role="list">
                    {citas.map((cita) => {
                        const status = String(cita.estado || "")
                            .trim()
                            .toLowerCase();

                        /*
                         * Fecha y hora programadas.
                         */
                        const { fecha, hora } = formatearFecha(
                            cita.fecha_programada
                        );

                        /*
                         * Ubicación de la cita.
                         */
                        const location = [
                            cita.ciudad,
                            cita.departamento,
                        ]
                            .filter(Boolean)
                            .join(", ");

                        /*
                         * Información de resolución.
                         *
                         * Utiliza:
                         * - fecha_cancelacion
                         * - fecha_completada
                         * - fecha_final
                         */
                        const metadata = obtenerMetadata(
                            cita,
                            status
                        );

                        /*
                         * Determinamos si el modal de información
                         * médica está abierto para esta cita.
                         */
                        const abierta =
                            citaVisible?.id === cita.id;

                        /*
                         * Acciones disponibles.
                         */
                        const actionMap = {
                            documentos: {
                                label: "Agregar documentos",
                                icon: ClipboardCheck,
                                tone: "secondary",
                                onClick: () =>
                                    completarCita?.(cita),
                            },

                            reprogramar: {
                                label: "Reprogramar",
                                icon: CalendarClock,
                                tone: "secondary",
                                onClick: () =>
                                    reprogramarCita?.(cita),
                            },

                            cancelar: {
                                label: "Cancelar",
                                icon: CircleX,
                                tone: "danger",
                                onClick: () =>
                                    cancelarCita?.(cita.id),
                            },

                            confirmar: {
                                label: "Confirmar",
                                icon: CircleCheck,
                                tone: "primary",
                                onClick: () =>
                                    confirmarCita?.(cita.id),
                            },

                            completar: {
                                label: "Completar",
                                icon: ClipboardCheck,
                                tone: "success",
                                onClick: () =>
                                    completarCita?.(cita),
                            },
                        };

                        /*
                         * Determinamos las acciones permitidas
                         * según el estado de la cita.
                         */
                        const actions =
                            getDoctorAppointmentActionKeys(
                                status,
                                cita
                            ).map((id) => ({
                                id,
                                ...actionMap[id],
                            }));

                        /*
                         * Tarjeta de la cita.
                         */
                        return (
                            <AppointmentCard
                                key={cita.id}
                                date={fecha}
                                time={hora}
                                person={{
                                    name:
                                        cita.paciente ||
                                        "Paciente de DocSmart",

                                    image: cita.foto_paciente,

                                    secondary:
                                        cita.especialidad || null,

                                    /*
                                     * Información médica proveniente
                                     * de la funcionalidad de main.
                                     */
                                    infoAbierta: abierta,

                                    infoPanelId:
                                        `info-medica-${cita.id}`,

                                    onVerInfo:
                                        status === "confirmada"
                                            ? () =>
                                                toggleMedicalInfo(
                                                    cita.id
                                                )
                                            : undefined,
                                }}
                                location={{
                                    name: location,
                                    address: cita.direccion,
                                }}
                                status={{
                                    key: status,
                                    label: capitalize(
                                        cita.estado
                                    ),
                                }}
                                actions={actions}
                                /*
                                 * Funcionalidad Ver detalles
                                 * proveniente de HEAD.
                                 */
                                onViewDetails={() =>
                                    openDetails(cita)
                                }
                                /*
                                 * Fecha de resolución o
                                 * información de vencimiento.
                                 */
                                metadata={metadata}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Modal de detalles de la cita */}
            <AppointmentDetailsModal
                abierto={detailsOpen}
                onCerrar={closeDetails}
                onExitComplete={() =>
                    setDetailsAppointment(null)
                }
                cita={detailsAppointment}
                counterpart="paciente"
            />

            {/* Modal de información médica del paciente */}
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
        </>
    );
}


/**
 * Consulta y muestra la información médica
 * registrada por el paciente.
 */
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
                if (activo) {
                    setDatos(respuesta);
                }
            })
            .catch((e) => {
                if (activo) {
                    setError(
                        e.response?.data?.detail ||
                        "No pudimos cargar la información médica."
                    );
                }
            })
            .finally(() => {
                if (activo) {
                    setCargando(false);
                }
            });

        return () => {
            activo = false;
        };
    }, [citaId]);

    return (
        <section
            id={panelId}
            className={styles.medicalCard}
            aria-label="Información médica del paciente"
        >
            <p className={styles.medicalNote}>
                Reportada por el paciente.
            </p>

            {/* Estado de carga */}
            {cargando && (
                <p role="status">
                    Cargando información…
                </p>
            )}

            {/* Error */}
            {error && (
                <p role="alert">
                    {error}
                </p>
            )}

            {/* Información médica */}
            {!cargando && !error && datos && (
                <>
                    {/* Peso y estatura */}
                    <div className={styles.medicalMeasures}>
                        <span>
                            Peso:{" "}
                            {datos.paciente.peso != null
                                ? `${datos.paciente.peso} kg`
                                : "Sin informar"}
                        </span>

                        <span>
                            Estatura:{" "}
                            {datos.paciente.estatura != null
                                ? `${datos.paciente.estatura} m`
                                : "Sin informar"}
                        </span>
                    </div>

                    {/* Sin antecedentes */}
                    {!datos.informacion_salud.length && (
                        <p>
                            El paciente aún no ha registrado
                            antecedentes.
                        </p>
                    )}

                    {/* Antecedentes médicos */}
                    {datos.informacion_salud.map((dato) => (
                        <div
                            key={dato.id}
                            className={styles.medicalRecord}
                        >
                            <small>
                                {dato.tipo_nombre}
                            </small>

                            <strong>
                                {dato.nombre}
                            </strong>

                            <span className={styles.medicalState}>
                                {capitalize(dato.estado)}
                            </span>

                            {dato.descripcion && (
                                <p>
                                    {dato.descripcion}
                                </p>
                            )}

                            {/* Alergias */}
                            {dato.tipo_codigo === "alergia" && (
                                <p>
                                    Reacción:{" "}
                                    {dato.reaccion || "Sin informar"}
                                </p>
                            )}

                            {/* Medicamentos */}
                            {dato.tipo_codigo === "medicamento" && (
                                <>
                                    <p>
                                        Dosis:{" "}
                                        {dato.dosis || "Sin informar"}
                                    </p>

                                    <p>
                                        Frecuencia:{" "}
                                        {dato.frecuencia || "Sin informar"}
                                    </p>

                                    <p>
                                        Vía:{" "}
                                        {dato.via_administracion ||
                                            "Sin informar"}
                                    </p>
                                </>
                            )}

                            {/* Fechas */}
                            {dato.fecha_inicio && (
                                <p>
                                    Inicio: {dato.fecha_inicio}
                                </p>
                            )}

                            {dato.fecha_fin && (
                                <p>
                                    Finalización: {dato.fecha_fin}
                                </p>
                            )}

                            {/* Condición permanente */}
                            {dato.es_permanente && (
                                <p>
                                    Uso o condición permanente
                                </p>
                            )}
                        </div>
                    ))}
                </>
            )}
        </section>
    );
}


/**
 * Mensaje cuando no existen citas.
 */
function EmptyAppointments({ filtered }) {
    return (
        <div className={styles.empty}>
            <span aria-hidden="true">
                <SearchX size={24} />
            </span>

            <div>
                <h3>
                    {filtered
                        ? "No hay citas con estos filtros"
                        : "No tienes citas programadas"}
                </h3>

                <p>
                    {filtered
                        ? "Prueba otro estado, paciente o fecha para ampliar los resultados."
                        : "Las nuevas solicitudes y consultas confirmadas aparecerán en esta agenda."}
                </p>
            </div>
        </div>
    );
}