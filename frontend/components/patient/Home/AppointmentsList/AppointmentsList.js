"use client";

import { ArrowRight, CalendarDays, Clock3, MapPin, Stethoscope } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import formatearFecha from "@/app/utils/fechaFormaterUtils";
import { getNextAppointment } from "../patientHomeData";
import { getContentTransition } from "../patientHomeMotion";
import styles from "./AppointmentsList.module.css";

function capitalize(value) {
    const text = String(value || "").trim();
    return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "Sin estado";
}

export default function AppointmentsList({ appointments = [] }) {
    const nextAppointment = getNextAppointment(appointments);
    const reduceMotion = useReducedMotion();

    return (
        <section className={styles.section} aria-labelledby="next-appointment-title">
            <div className={styles.heading}>
                <div>
                    <h2 id="next-appointment-title">Tu próxima cita</h2>
                    <p>La atención confirmada más cercana en tu agenda.</p>
                </div>
                <Link href="/patient/my-appointments">
                    Ver agenda <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>

            <AnimatePresence initial={false} mode="wait">
                <m.div
                    key={nextAppointment ? `appointment-${nextAppointment.id}` : "empty"}
                    {...getContentTransition(reduceMotion)}
                >
                    {nextAppointment
                        ? <AppointmentCard appointment={nextAppointment} />
                        : <AppointmentEmpty />}
                </m.div>
            </AnimatePresence>
        </section>
    );
}

function AppointmentCard({ appointment }) {
    const { fecha, hora } = formatearFecha(appointment.fecha_programada);
    const location = [appointment.ciudad, appointment.direccion].filter(Boolean).join(" · ");
    const status = String(appointment.estado || "").toLowerCase();

    return (
        <article className={styles.appointment}>
            <div className={styles.schedule}>
                <span className={styles.calendarIcon} aria-hidden="true"><CalendarDays size={22} /></span>
                <div>
                    <span>Fecha y hora</span>
                    <strong>{fecha}</strong>
                    <small><Clock3 size={15} aria-hidden="true" />{hora}</small>
                </div>
            </div>

            <div className={styles.details}>
                <div className={styles.doctor}>
                    <Image
                        src={appointment.foto_medico || "/images/foto_default.png"}
                        alt={`Foto de ${appointment.medico || "médico"}`}
                        width={64}
                        height={64}
                    />
                    <div>
                        <span>Atención con</span>
                        <h3>Dr. {appointment.medico || "Profesional de DocSmart"}</h3>
                        <p><Stethoscope size={16} aria-hidden="true" />{appointment.especialidad || "Especialidad no disponible"}</p>
                    </div>
                </div>

                <div className={styles.location}>
                    <MapPin size={19} aria-hidden="true" />
                    <div>
                        <span>Consultorio</span>
                        <strong>{location || "Ubicación no disponible"}</strong>
                        {appointment.departamento && <small>{appointment.departamento}</small>}
                    </div>
                </div>
            </div>

            <div className={styles.footer}>
                <span className={`${styles.status} ${styles[status] || ""}`}>{capitalize(appointment.estado)}</span>
                <p>Consulta los detalles o gestiona esta cita desde tu agenda.</p>
                <Link href="/patient/my-appointments">
                    Ver detalles <ArrowRight size={16} aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

function AppointmentEmpty() {
    return (
        <div className={styles.empty}>
            <span aria-hidden="true"><CalendarDays size={26} /></span>
            <div>
                <h3>No tienes citas próximas confirmadas</h3>
                <p>Cuando quieras programar tu siguiente atención, explora los profesionales disponibles.</p>
            </div>
            <Link href="/patient/find-doctors">Encontrar un doctor <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
    );
}
