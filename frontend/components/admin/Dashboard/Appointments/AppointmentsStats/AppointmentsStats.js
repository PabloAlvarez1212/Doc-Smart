"use client";
import { CalendarX2 } from "lucide-react";
import styles from "./AppointmentStats.module.css";
import AppointmentStatusChart from "../AppointmentStatusChart";
import AppointmentsByMonthChart from "../AppointmentByMonthChart";
import AppointmentsBySpecialtyChart from "../AppointmentsBySpecialtyChart";
import AppointmentsByWeekdayChart from "../AppointmentsByWeekdayChart";
import AppointmentsByHourChart from "../AppointmentsByHourChart";

export default function AppointmentStats({
    citasPorEstado, citasPorMes, citasPorEspecialidad, citasPorDiaSemana, citasPorHora, tasaCancelacion
}) {
    const cancellationPercentage = Number(tasaCancelacion?.porcentaje);
    const cancellationProgress = Number.isFinite(cancellationPercentage)
        ? Math.min(100, Math.max(0, cancellationPercentage))
        : 0;

    return (
        <section className={styles.grid} aria-label="Estadísticas de citas">

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Citas por estado</h3>
                    <p>Distribución actual de las citas registradas.</p>
                </div>

                {citasPorEstado?.length ? (
                    <AppointmentStatusChart data={citasPorEstado} />
                ) : (
                    <p className={styles.empty}>No hay datos disponibles.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Citas solicitadas por mes</h3>
                    <p>Evolución mensual de las citas creadas en DocSmart.</p>
                </div>

                {citasPorMes?.length ? (
                    <AppointmentsByMonthChart data={citasPorMes} />
                ) : (
                    <p className={styles.empty}>No hay datos disponibles.</p>
                )}
            </article>

            <article className={`${styles.chartCard} ${styles.fullWidth}`}>
                <div className={styles.chartHeader}>
                    <h3>Citas por especialidad</h3>
                    <p>Especialidades con mayor número de citas solicitadas.</p>
                </div>

                {citasPorEspecialidad?.length ? (
                    <AppointmentsBySpecialtyChart data={citasPorEspecialidad} />
                ) : (
                    <p className={styles.empty}>No hay datos disponibles.</p>
                )}
            </article>

            {tasaCancelacion ? (
                <article className={styles.cancellationCard} aria-labelledby="cancellation-rate-title">
                    <div className={styles.cancellationHeader}>
                        <span className={styles.cancellationIcon} aria-hidden="true">
                            <CalendarX2 size={22} strokeWidth={1.9} />
                        </span>

                        <div className={styles.cancellationHeading}>
                            <h3 id="cancellation-rate-title">Tasa de cancelación</h3>
                            <p>Proporción de citas canceladas sobre el total registrado.</p>
                        </div>

                        <span className={styles.cancellationSample}>
                            {tasaCancelacion.total_citas} citas analizadas
                        </span>
                    </div>

                    <div className={styles.cancellationBody}>
                        <div className={styles.cancellationRate}>
                            <strong className={styles.kpiValue}>{tasaCancelacion.porcentaje}%</strong>
                            <span>del total de citas</span>
                        </div>

                        <div className={styles.cancellationDetail}>
                            <p className={styles.cancellationSummary}>
                                <strong>{tasaCancelacion.total_canceladas}</strong> de {tasaCancelacion.total_citas} citas fueron canceladas.
                            </p>

                            <div className={styles.cancellationProgressMeta} aria-hidden="true">
                                <span>Citas canceladas</span>
                                <span>{tasaCancelacion.total_canceladas} / {tasaCancelacion.total_citas}</span>
                            </div>
                            <div
                                className={styles.cancellationProgress}
                                role="progressbar"
                                aria-label={`Tasa de cancelación: ${tasaCancelacion.porcentaje}%`}
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-valuenow={cancellationProgress}
                            >
                                <span
                                    className={styles.cancellationProgressFill}
                                    style={{ width: `${cancellationProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </article>
            ) : (
                <p className={`${styles.empty} ${styles.compactEmpty}`}>No hay datos de cancelación disponibles.</p>
            )}

            <div className={styles.demandHeading}>
                <span>Patrones de demanda</span>
                <h3>Cuándo se programan las citas</h3>
                <p>Compara la actividad semanal y la distribución de horarios.</p>
            </div>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Demanda por día de la semana</h3>
                    <p>Cantidad de citas programadas para cada día de la semana.</p>
                </div>

                {citasPorDiaSemana?.length ? (
                    <AppointmentsByWeekdayChart data={citasPorDiaSemana} />
                ) : (
                    <p className={styles.empty}>No hay datos disponibles.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Demanda por horario</h3>
                    <p>Cantidad de citas programadas según la hora del día.</p>
                </div>

                {citasPorHora?.length ? (
                    <AppointmentsByHourChart data={citasPorHora} />
                ) : (
                    <p className={styles.empty}>No hay datos disponibles.</p>
                )}
            </article>

        </section>
    );
}
