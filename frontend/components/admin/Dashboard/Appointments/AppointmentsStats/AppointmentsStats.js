"use client";

import DashboardModuleState from "../../DashboardModuleState/DashboardModuleState";
import AppointmentsByHourChart from "../AppointmentsByHourChart";
import AppointmentsBySpecialtyChart from "../AppointmentsBySpecialtyChart";
import AppointmentsByWeekdayChart from "../AppointmentsByWeekdayChart";
import AppointmentsCreatedByPeriodChart from "../AppointmentsCreatedByPeriodChart";
import AppointmentsFilters from "../AppointmentsFilters";
import AppointmentStatusChart from "../AppointmentStatusChart";
import { hasAppointmentsByWeekday } from "../appointmentStatsData";
import styles from "./AppointmentStats.module.css";

export default function AppointmentStats({
    citasPorEstado,
    citasCreadasPorEstado,
    citasCreadasPorPeriodo,
    filtros,
    cambiarAnio,
    cambiarMes,
    citasPorEspecialidad,
    citasCreadasPorEspecialidad,
    citasPorDiaSemana,
    citasPorHora,
    loading = false,
    error = false,
}) {
    const grouping = citasCreadasPorPeriodo?.agrupacion === "dia" ? "dia" : "mes";
    const activityData = Array.isArray(citasCreadasPorPeriodo?.datos)
        ? citasCreadasPorPeriodo.datos
        : [];
    const hasWeekdayData = hasAppointmentsByWeekday(citasPorDiaSemana);

    return (
        <section className={styles.appointments} aria-label="Estadísticas de citas">
            <AppointmentsFilters
                filters={filtros}
                onYearChange={cambiarAnio}
                onMonthChange={cambiarMes}
                loading={loading}
            />

            {loading || error ? (
                <DashboardModuleState
                    loading={loading}
                    error={error}
                    cardCount={7}
                    moduleName="citas"
                />
            ) : (
                <div className={styles.grid}>
                    <div className={`${styles.groupHeading} ${styles.creationHeading}`}>
                        <span>Creación / demanda</span>
                        <h3>Cuándo se generan las citas</h3>
                        <p>Estas métricas utilizan la fecha en que la cita fue creada.</p>
                    </div>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Citas creadas por período</h3>
                            <p>Cantidad de citas creadas en el período seleccionado. Al filtrar por año se agrupan por mes y al seleccionar un mes se agrupan por día.</p>
                        </div>

                        {activityData.length ? (
                            <AppointmentsCreatedByPeriodChart
                                data={activityData}
                                grouping={grouping}
                            />
                        ) : (
                            <p className={styles.empty}>No hay citas creadas en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Citas creadas por especialidad</h3>
                            <p>Citas creadas durante el período seleccionado, agrupadas según la especialidad del médico asignado.</p>
                        </div>

                        {citasCreadasPorEspecialidad?.length ? (
                            <AppointmentsBySpecialtyChart
                                data={citasCreadasPorEspecialidad}
                                variant="created"
                            />
                        ) : (
                            <p className={styles.empty}>No hay citas creadas por especialidad en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={`${styles.chartCard} ${styles.fullWidth}`}>
                        <div className={styles.chartHeader}>
                            <h3>Citas creadas por estado</h3>
                            <p>Estado actual de las citas que fueron creadas durante el período seleccionado.</p>
                        </div>

                        {citasCreadasPorEstado?.length ? (
                            <AppointmentStatusChart
                                data={citasCreadasPorEstado}
                                ariaLabel="Citas creadas por estado"
                            />
                        ) : (
                            <p className={styles.empty}>No hay citas creadas en el período seleccionado.</p>
                        )}
                    </article>

                    <div className={`${styles.groupHeading} ${styles.scheduleHeading}`}>
                        <span>Programación / agenda</span>
                        <h3>Cuándo serán atendidas las citas</h3>
                        <p>Estas métricas utilizan la fecha programada para la atención.</p>
                    </div>

                    <article className={`${styles.chartCard} ${styles.fullWidth}`}>
                        <div className={styles.chartHeader}>
                            <h3>Citas programadas por estado</h3>
                            <p>Estado actual de las citas cuya fecha de atención está programada dentro del período seleccionado.</p>
                        </div>

                        {citasPorEstado?.length ? (
                            <AppointmentStatusChart
                                data={citasPorEstado}
                                ariaLabel="Citas programadas por estado"
                            />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={`${styles.chartCard} ${styles.fullWidth}`}>
                        <div className={styles.chartHeader}>
                            <h3>Citas programadas por especialidad</h3>
                            <p>Citas cuya fecha de atención está programada dentro del período seleccionado, agrupadas por especialidad.</p>
                        </div>

                        {citasPorEspecialidad?.length ? (
                            <AppointmentsBySpecialtyChart
                                data={citasPorEspecialidad}
                                variant="scheduled"
                            />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas por especialidad en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Citas programadas por día</h3>
                            <p>Distribución de las citas programadas en el período seleccionado según el día de la semana de su atención.</p>
                        </div>

                        {hasWeekdayData ? (
                            <AppointmentsByWeekdayChart data={citasPorDiaSemana} />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas por día en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Citas programadas por hora</h3>
                            <p>Distribución de las citas programadas en el período seleccionado según la hora de atención.</p>
                        </div>

                        {citasPorHora?.length ? (
                            <AppointmentsByHourChart data={citasPorHora} />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas por hora en el período seleccionado.</p>
                        )}
                    </article>
                </div>
            )}
        </section>
    );
}
