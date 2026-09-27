"use client";
import styles from "./AppointmentStats.module.css";
import AppointmentStatusChart from "../AppointmentStatusChart";
import AppointmentsByMonthChart from "../AppointmentByMonthChart";
import AppointmentsBySpecialtyChart from "../AppointmentsBySpecialtyChart";
import AppointmentsByWeekdayChart from "../AppointmentsByWeekdayChart";
import AppointmentsByHourChart from "../AppointmentsByHourChart";
import DashboardModuleState from "../../DashboardModuleState/DashboardModuleState";

export default function AppointmentStats({
    citasPorEstado,
    citasPorMes,
    citasPorEspecialidad,
    citasPorDiaSemana,
    citasPorHora,
    loading = false,
    error = false,
}) {
    if (loading || error) {
        return (
            <DashboardModuleState
                loading={loading}
                error={error}
                cardCount={5}
                moduleName="citas"
            />
        );
    }

    return (
        <section className={styles.grid} aria-label="Estadísticas de citas">

            <article className={`${styles.chartCard} ${styles.fullWidth}`}>
                <div className={styles.chartHeader}>
                    <h3>Distribución de citas por estado</h3>
                    <p>Cantidad y proporción de las citas registradas en cada estado.</p>
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

            <article className={styles.chartCard} >
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
