"use client";

import { Clock3 } from "lucide-react";
import styles from "./DoctorStats.module.css";
import DoctorsBySpecialtyChart from "../DoctorsBySpecialtyChart";
import DoctorsValidationStatusChart from "../DoctorsValidationStatusChart";
import ValidationRequestsByPeriodChart from "../ValidationRequestsByPeriodChart";
import DoctorsByAppointmentsChart from "../DoctorsByAppointmentsChart";
import DashboardModuleState from "../../DashboardModuleState/DashboardModuleState";
import DashboardPeriodFilters from "../../DashboardPeriodFilters/DashboardPeriodFilters";

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
    solicitudesValidacionPorPeriodo,
    filtros,
    cambiarAnio,
    cambiarMes,
    medicosQueMasAtienden,
    tiempoPromedioValidacion,
    loading = false,
    error = false,
}) {
    const formattedValidationTime = formatValidationTime(
        tiempoPromedioValidacion?.segundos
    );
    const reviewedRequests = tiempoPromedioValidacion?.solicitudes_revisadas ?? 0;
    const grouping = solicitudesValidacionPorPeriodo?.agrupacion === "dia"
        ? "dia"
        : "mes";
    const validationRequests = Array.isArray(solicitudesValidacionPorPeriodo?.datos)
        ? solicitudesValidacionPorPeriodo.datos
        : [];

    return (
        <section className={styles.doctors} aria-label="Estadísticas de médicos">
            <DashboardPeriodFilters
                filters={filtros}
                onYearChange={cambiarAnio}
                onMonthChange={cambiarMes}
                moduleName="médicos"
                idPrefix="doctors"
                loading={loading}
            />

            {loading || error ? (
                <DashboardModuleState
                    loading={loading}
                    error={error}
                    cardCount={5}
                    moduleName="médicos"
                />
            ) : (
                <div className={styles.stats}>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Médicos con más citas completadas</h3>
                    <p>Médicos con mayor cantidad de citas completadas programadas en el período seleccionado.</p>
                </div>
                {medicosQueMasAtienden?.length ? (
                    <DoctorsByAppointmentsChart data={medicosQueMasAtienden} />
                ) : (
                    <p className={`${styles.empty} ${styles.rankingEmpty}`}>
                        No hay citas completadas en el período seleccionado.
                    </p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Estado de validación de médicos</h3>
                    <p>Estado de validación de los médicos al cierre del período seleccionado.</p>
                </div>

                {medicosPorEstadoValidacion?.length ? (
                    <DoctorsValidationStatusChart data={medicosPorEstadoValidacion} />
                ) : (
                    <p className={styles.empty}>No hay médicos registrados al cierre del período seleccionado.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Médicos aprobados por especialidad</h3>
                    <p>Distribución de médicos aprobados al cierre del período seleccionado.</p>
                </div>

                {medicosPorEspecialidad?.length ? (
                    <DoctorsBySpecialtyChart data={medicosPorEspecialidad} />
                ) : (
                    <p className={`${styles.empty} ${styles.specialtyEmpty}`}>
                        No hay médicos aprobados al cierre del período seleccionado.
                    </p>
                )}
            </article>

            <article
                className={styles.chartCard}
            >
                <div className={styles.chartHeader}>
                    <h3>{`Solicitudes de validación por ${grouping === "dia" ? "día" : "mes"}`}</h3>
                    <p>Solicitudes de validación recibidas durante el período seleccionado.</p>
                </div>

                {validationRequests.length ? (
                    <ValidationRequestsByPeriodChart
                        data={validationRequests}
                        grouping={grouping}
                    />
                ) : (
                    <p className={styles.empty}>No hay solicitudes de validación en el período seleccionado.</p>
                )}
            </article>

            <article className={styles.validationTimeCard} aria-labelledby="validation-time-title">
                <div className={styles.validationTimeHeading}>
                    <span className={styles.validationTimeIcon} aria-hidden="true">
                        <Clock3 size={22} strokeWidth={1.9} />
                    </span>
                    <div>
                        <h3 id="validation-time-title">Tiempo promedio de validación</h3>
                        <p>Tiempo promedio de las solicitudes revisadas durante el período seleccionado.</p>
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
                            : "No hay solicitudes revisadas en este período"}
                    </span>
                </div>

                <span className={styles.reviewedRequests}>
                    {reviewedRequests} {reviewedRequests === 1 ? "solicitud revisada" : "solicitudes revisadas"}
                </span>
            </article>
                </div>
            )}
        </section>
    );
}
