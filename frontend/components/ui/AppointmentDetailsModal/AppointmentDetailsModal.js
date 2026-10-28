"use client";

import {CalendarDays,Clock3,MapPin,MessageSquareText,Stethoscope,TicketCheck,UserRound,ClipboardList,} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import formatearFecha, { formatearFechaResolucion } from "@/app/utils/fechaFormaterUtils";
import { getAppointmentStatusMoment } from '../AppointmentCard/appointmentDetails';
import AppointmentCode from "../AppointmentCode/AppointmentCode";
import Modal from "../Modal/Modal";
import { getAppointmentDetailsData, getAppointmentChatHref } from "./appointmentDetailsModalData";
import styles from "./AppointmentDetailsModal.module.css";
import { useEffect, useState } from "react";
import {obtenerHistorialClinicoService} from "@/app/services/medicalHistoryServices";
import DocumentosSeguimientoList from"../DocumentosSeguimientoList/DocumentosSeguimientoList";

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
    mostrarHistorialClinico = false,
}) {
    const data = getAppointmentDetailsData(cita, counterpart);
    const chatHref = getAppointmentChatHref(cita, counterpart);
    const scheduled = data.scheduledAt ? formatearFecha(data.scheduledAt) : null;
    const statusKey = data.status.toLowerCase();
    const statusMoment = getAppointmentStatusMoment(cita);
    const [historialClinico, setHistorialClinico] = useState(null)
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [errorHistorial, setErrorHistorial] = useState("");
    const debeMostrarHistorial = mostrarHistorialClinico && statusKey === "completada";
    const historialId = cita?.historial_id;
    const citaId = cita?.id;
    const historialDeEstaCita = historialClinico && String(historialClinico.cita_id) === String(citaId)
        ? historialClinico
        : null;
    const PersonIcon = counterpart === "paciente" ? UserRound : Stethoscope;

    // ==========================================
    // INFORMACIÓN DE CANCELACIÓN
    // ==========================================
    const esCancelada = statusKey === "cancelada";

    const responsables = {
        paciente: "Paciente",
        medico: "Médico",
        administrador: "Administrador",
        sistema: "Sistema",
    };

    const responsableCancelacion =
        responsables[
            String(cita?.cancelada_por || "")
                .trim()
                .toLowerCase()
        ] || "No registrado";

    const motivoCancelacion =
        String(cita?.motivo_cancelacion || "").trim()
        || "No registrado";

    const fechaCancelacion =
        cita?.fecha_cancelacion
            ? formatearFecha(cita.fecha_cancelacion)
            : null;

    useEffect(() => {
        if (!abierto || !debeMostrarHistorial) {
            setHistorialClinico(null);
            setErrorHistorial("");
            setCargandoHistorial(false);
            return;
        }
        if (!historialId) {
            setHistorialClinico(null);
            setErrorHistorial(
                "Esta cita no tiene un historial clínico asociado."
            );
            setCargandoHistorial(false);
            return;
        }
        const controller = new AbortController();
        const cargarHistorial = async () => {setCargandoHistorial(true);setErrorHistorial("");setHistorialClinico(null);
            try {
                const resultado =
                    await obtenerHistorialClinicoService(
                        historialId,{signal: controller.signal}
                    );

                if (controller.signal.aborted) {return;}
                // Comprobar que el registro corresponda
                // exactamente a la cita seleccionada.
                if (String(resultado?.cita_id) !== String(citaId)
                ) {
                    throw new Error(
                        "El historial no corresponde a esta cita."
                    );
                }
                setHistorialClinico(resultado);

            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                setErrorHistorial(
                    error.response?.status === 403
                        ? "No tienes permiso para consultar este historial."
                        : error.response?.status === 404
                            ? "No se encontró el historial clínico de esta cita."
                            : error.message ===
                            "El historial no corresponde a esta cita."
                                ? error.message
                                : "No fue posible cargar la información clínica."
                );

            } finally {
                if (!controller.signal.aborted) {
                    setCargandoHistorial(false);
                }
            }
        };

        cargarHistorial();
        return () => {
            controller.abort();
        };

    }, [abierto, debeMostrarHistorial, historialId, citaId]);

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
                {chatHref && (
                    <Link className={styles.chatLink}href={chatHref}onClick={onCerrar}>
                        <MessageSquareText size={17} />
                        <span>Ir al chat</span>
                    </Link>
                )}
                                <div className={styles.summary}>
                    <div>
                        <span className={styles.summaryLabel}>Estado actual</span>
                        <p>Información de solo lectura</p>
                    </div>
                    <div className={styles.statusSummary}>
                        <span className={`${styles.status} ${styles[statusKey] || ""}`}>
                            {capitalize(data.status)}
                        </span>
                        {statusMoment && <time className={styles.statusDate} dateTime={statusMoment.at}>
                            {statusMoment.label} {formatearFechaResolucion(statusMoment.at)}
                        </time>}
                    </div>
                </div>

                <section className={styles.section} aria-labelledby="appointment-identification-title">
                    <SectionTitle
                        id="appointment-identification-title"
                        icon={TicketCheck}
                        title="Información de la cita"
                    />
                    <AppointmentCode value={data.code} contextId={data.id} />
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

                {/* ==========================================
                    INFORMACIÓN DE CANCELACIÓN
                ========================================== */}
                {esCancelada && (
                    <section
                        className={styles.section}
                        aria-labelledby="appointment-cancellation-title"
                    >
                        <SectionTitle
                            id="appointment-cancellation-title"
                            icon={MessageSquareText}
                            title="Información de cancelación"
                        />
                        <div className={styles.dataGrid}>
                            <DetailItem
                                label="Cancelada por"
                                value={responsableCancelacion}
                            />
                            <DetailItem
                                icon={CalendarDays}
                                label="Fecha de cancelación"
                                value={
                                    fechaCancelacion
                                        ? `${fechaCancelacion.fecha} · ${fechaCancelacion.hora}`
                                        : "No registrada"
                                }
                            />
                            <DetailItem
                                className={styles.fullWidth}
                                label="Motivo de cancelación"
                                value={motivoCancelacion}
                            />
                        </div>
                    </section>

                )}

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

                {!debeMostrarHistorial && (
                    <section
                        className={styles.section}
                        aria-labelledby="appointment-reason-title"
                    >
                        <SectionTitle
                            id="appointment-reason-title"
                            icon={MessageSquareText}
                            title="Motivo de consulta"
                        />

                        <p className={`${styles.reason} ${!data.reason ? styles.emptyValue : ""}`}>
                            {data.reason || "Sin motivo de consulta registrado"}
                        </p>
                    </section>
                )}

                {debeMostrarHistorial && (
                    <>
                        {!historialDeEstaCita && !errorHistorial && (
                            <section
                                className={styles.section}
                                aria-busy="true"
                            >
                                <SectionTitle
                                    id="appointment-clinical-loading"
                                    icon={ClipboardList}
                                    title="Información clínica de la atención"
                                />

                                <div className={styles.clinicalLoading}>
                                    <div className={styles.skeletonLine} />
                                    <div className={styles.skeletonLine} />
                                    <div className={styles.skeletonLine} />
                                </div>

                                <p role="status">
                                    Cargando información clínica...
                                </p>
                            </section>
                        )}

                        {errorHistorial && (
                            <section className={styles.section}>
                                <p role="alert">
                                    {errorHistorial}
                                </p>
                            </section>
                        )}

                        {historialDeEstaCita  && (

                            <>
                                <section
                                    className={styles.section}
                                    aria-labelledby="appointment-clinical-title"
                                >

                                    <SectionTitle
                                        id="appointment-clinical-title"
                                        icon={ClipboardList}
                                        title="Información clínica de la atención"
                                    />

                                    <div className={styles.dataGrid}>

                                        <DetailItem
                                            className={styles.fullWidth}
                                            label="Motivo de consulta"
                                            value={
                                                historialClinico.motivo_consulta ||
                                                "Sin motivo registrado"
                                            }
                                        />

                                        <DetailItem
                                            className={styles.fullWidth}
                                            label="Diagnóstico general"
                                            value={
                                                historialClinico.diagnostico_general ||
                                                "Sin diagnóstico registrado"
                                            }
                                        />

                                        <DetailItem
                                            className={styles.fullWidth}
                                            label="Observaciones"
                                            value={
                                                historialClinico.observaciones ||
                                                "Sin observaciones adicionales"
                                            }
                                        />

                                    </div>

                                </section>

                                <DocumentosSeguimientoList
                                    citaId={historialClinico.cita_id}
                                    documentos={
                                        historialClinico.documentos || []
                                    }
                                />
                            </>
                        )}
                    </>
                )}
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
