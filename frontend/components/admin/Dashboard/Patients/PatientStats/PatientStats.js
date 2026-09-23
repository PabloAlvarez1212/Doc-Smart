import PatientsByAppointmentsChart from "../PatientsByAppointmentsChart";
import PatientsByAgeChart from "../PatientsByAgeChart";
import PatientsByMonthChart from "../PatientsByMonthChart";
import styles from "./PatientStats.module.css";

export default function PatientStats({
    pacientesPorCitas,
    pacientesPorEdad,
    pacientesPorMes,
}) {
    return (
        <section className={styles.stats} aria-label="Estadísticas de pacientes">
            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Pacientes con más citas</h3>
                    <p>Top 5 pacientes con mayor número de citas registradas.</p>
                </div>

                {pacientesPorCitas?.length ? (
                    <PatientsByAppointmentsChart data={pacientesPorCitas} />
                ) : (
                    <p className={styles.empty}>No hay pacientes con citas para mostrar.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Pacientes por edad</h3>
                    <p>Distribución de pacientes por rango de edad.</p>
                </div>

                {pacientesPorEdad?.length ? (
                    <PatientsByAgeChart data={pacientesPorEdad} />
                ) : (
                    <p className={styles.empty}>No hay rangos de edad para mostrar.</p>
                )}
            </article>

            <article className={`${styles.chartCard} ${styles.fullWidth}`}>
                <div className={styles.chartHeader}>
                    <h3>Pacientes registrados por mes</h3>
                    <p>Evolución mensual del registro de nuevos pacientes.</p>
                </div>

                {pacientesPorMes?.length ? (
                    <PatientsByMonthChart data={pacientesPorMes} />
                ) : (
                    <p className={styles.empty}>No hay registros mensuales para mostrar.</p>
                )}
            </article>
        </section>
    );
}
