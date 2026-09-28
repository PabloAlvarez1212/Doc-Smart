"use client";

import DashboardModuleState from "../../DashboardModuleState/DashboardModuleState";
import AppointmentsByHourChart from "../AppointmentsByHourChart";
import AppointmentsBySpecialtyChart from "../AppointmentsBySpecialtyChart";
import AppointmentsByWeekdayChart from "../AppointmentsByWeekdayChart";
import AppointmentsCreatedByPeriodChart from "../AppointmentsCreatedByPeriodChart";
import AppointmentsFilters from "../AppointmentsFilters";
import AppointmentStatusChart from "../AppointmentStatusChart";
import styles from "./AppointmentStats.module.css";

export default function AppointmentStats({
    citasPorEstado,
    citasCreadasPorPeriodo,
    filtros,
    cambiarAnio,
    cambiarMes,
    citasPorEspecialidad,
    citasPorDiaSemana,
    citasPorHora,
    loading = false,
    error = false,
}) {
    const grouping = citasCreadasPorPeriodo?.agrupacion === "dia" ? "dia" : "mes";
    const activityData = Array.isArray(citasCreadasPorPeriodo?.datos)
        ? citasCreadasPorPeriodo.datos
        : [];

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
                    cardCount={5}
                    moduleName="citas"
                />
            ) : (
                <div className={styles.grid}>
                    <article className={`${styles.chartCard} ${styles.fullWidth}`}>
                        <div className={styles.chartHeader}>
                            <h3>Citas programadas por estado</h3>
                            <p>Estado de las citas programadas en el período seleccionado.</p>
                        </div>

                        {citasPorEstado?.length ? (
                            <AppointmentStatusChart data={citasPorEstado} />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>{`Citas creadas por ${grouping === "dia" ? "día" : "mes"}`}</h3>
                            <p>
                                Cantidad de citas creadas durante el período seleccionado.
                            </p>
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
                            <h3>Citas programadas por especialidad</h3>
                            <p>Cantidad de citas programadas por especialidad en el período seleccionado.</p>
                        </div>

                        {citasPorEspecialidad?.length ? (
                            <AppointmentsBySpecialtyChart data={citasPorEspecialidad} />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas en el período seleccionado.</p>
                        )}
                    </article>

                    <div className={styles.demandHeading}>
                        <span>Patrones de programación</span>
                        <h3>Cuándo están programadas las citas</h3>
                        <p>Consulta los días y horarios de las citas del período seleccionado.</p>
                    </div>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Citas programadas por día de la semana</h3>
                            <p>Cantidad de citas programadas según el día de la semana.</p>
                        </div>

                        {citasPorDiaSemana?.length ? (
                            <AppointmentsByWeekdayChart data={citasPorDiaSemana} />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Citas programadas por hora</h3>
                            <p>Cantidad de citas programadas según la hora del día.</p>
                        </div>

                        {citasPorHora?.length ? (
                            <AppointmentsByHourChart data={citasPorHora} />
                        ) : (
                            <p className={styles.empty}>No hay citas programadas en el período seleccionado.</p>
                        )}
                    </article>
                </div>
            )}
        </section>
    );
}
