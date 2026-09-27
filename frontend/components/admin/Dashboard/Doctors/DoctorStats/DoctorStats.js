"use client";

import { Clock3 } from "lucide-react";
import styles from "./DoctorStats.module.css";
import DoctorsBySpecialtyChart from "../DoctorsBySpecialtyChart";
import DoctorsValidationStatusChart from "../DoctorsValidationStatusChart";
import ValidationRequestsByMonthChart from "../ValidationRequestsByMonthChart";
import DoctorsByAppointmentsChart from "../DoctorsByAppointmentsChart";

const numberFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 1,
});

function formatValidationTime(seconds) {
    if (seconds === null || seconds === undefined || seconds === "") {
        return null;
    }

    const numericSeconds = Number(seconds);

    if (!Number.isFinite(numericSeconds) || numericSeconds < 0) {
        return null;
    }

    if (numericSeconds < 3600) {
        const minutes = numericSeconds === 0
            ? 0
            : Math.max(1, Math.round(numericSeconds / 60));

        return {
            value: numberFormatter.format(minutes),
            unit: minutes === 1 ? "minuto" : "minutos",
        };
    }

    if (numericSeconds < 86400) {
        const hours = Math.round((numericSeconds / 3600) * 10) / 10;

        return {
            value: numberFormatter.format(hours),
            unit: hours === 1 ? "hora" : "horas",
        };
    }

    const days = Math.round((numericSeconds / 86400) * 10) / 10;

    return {
        value: numberFormatter.format(days),
        unit: days === 1 ? "día" : "días",
    };
}

export default function DoctorStats({
    medicosPorEspecialidad,
    medicosPorEstadoValidacion,
    solicitudesValidacionPorMes,
    medicosQueMasAtienden,
    tiempoPromedioValidacion,
}) {
    const formattedValidationTime = formatValidationTime(
        tiempoPromedioValidacion?.segundos
    );
    const reviewedRequests = tiempoPromedioValidacion?.solicitudes_revisadas ?? 0;

    return (
        <section className={styles.stats} aria-label="Estadísticas de médicos">

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Médicos que más atienden</h3>
                    <p>Médicos con mayor cantidad de citas completadas.</p>
                </div>
                {medicosQueMasAtienden?.length ? (
                    <DoctorsByAppointmentsChart data={medicosQueMasAtienden} />
                ) : (
                    <p className={`${styles.empty} ${styles.rankingEmpty}`}>
                        No hay citas completadas para construir el ranking.
                    </p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Distribución por estado de validación</h3>
                    <p>
                        Cantidad y proporción de médicos según su
                        estado actual de validación.
                    </p>
                </div>

                {medicosPorEstadoValidacion?.length ? (
                    <DoctorsValidationStatusChart data={medicosPorEstadoValidacion} />
                ) : (
                    <p className={styles.empty}>No hay estados de validación para mostrar.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Médicos por especialidad</h3>
                    <p>
                        Distribución de los médicos aprobados según
                        su especialidad.
                    </p>
                </div>

                {medicosPorEspecialidad?.length ? (
                    <DoctorsBySpecialtyChart data={medicosPorEspecialidad} />
                ) : (
                    <p className={`${styles.empty} ${styles.specialtyEmpty}`}>
                        No hay médicos aprobados para mostrar.
                    </p>
                )}
            </article>

            <article
                className={styles.chartCard}
            >
                <div className={styles.chartHeader}>
                    <h3>Solicitudes de validación</h3>
                    <p>
                        Cantidad de solicitudes de validación
                        registradas por mes.
                    </p>
                </div>

                {solicitudesValidacionPorMes?.length ? (
                    <ValidationRequestsByMonthChart data={solicitudesValidacionPorMes} />
                ) : (
                    <p className={styles.empty}>No hay solicitudes de validación para mostrar.</p>
                )}
            </article>

            <article className={styles.validationTimeCard} aria-labelledby="validation-time-title">
                <div className={styles.validationTimeHeading}>
                    <span className={styles.validationTimeIcon} aria-hidden="true">
                        <Clock3 size={22} strokeWidth={1.9} />
                    </span>
                    <div>
                        <h3 id="validation-time-title">Tiempo promedio de validación</h3>
                        <p>Tiempo entre la solicitud del médico y su revisión administrativa.</p>
                    </div>
                </div>

                <div className={styles.validationTimeMetric}>
                    {formattedValidationTime ? (
                        <strong>
                            <span>{formattedValidationTime.value}</span>
                            <small>{formattedValidationTime.unit}</small>
                        </strong>
                    ) : (
                        <strong className={styles.unavailableMetric}>—</strong>
                    )}
                    <span className={styles.validationTimeCaption}>
                        {formattedValidationTime
                            ? "Promedio de las solicitudes revisadas"
                            : "Aún no hay solicitudes revisadas"}
                    </span>
                </div>

                <span className={styles.reviewedRequests}>
                    {reviewedRequests} {reviewedRequests === 1 ? "solicitud revisada" : "solicitudes revisadas"}
                </span>
            </article>

        </section>
    );
}
