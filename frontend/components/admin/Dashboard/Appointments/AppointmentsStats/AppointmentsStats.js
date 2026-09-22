"use client";
import styles from "./AppointmentStats.module.css";
import AppointmentStatusChart from "../AppointmentStatusChart";
import AppointmentsByMonthChart from "../AppointmentByMonthChart";
import AppointmentsBySpecialtyChart from "../AppointmentsBySpecialtyChart";

export default function AppointmentStats({
    citasPorEstado, citasPorMes, citasPorEspecialidad
}) {
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

        </section>
    );
}
