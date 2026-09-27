import PatientsByAppointmentsChart from "../PatientsByAppointmentsChart";
import PatientsByAgeChart from "../PatientsByAgeChart";
import PatientsByMonthChart from "../PatientsByMonthChart";
import PatientsByAppointmentCountChart from "../PatientsByAppointmentCountChart";
import ActivePatientsByMonthChart from "../ActivePatientsByMonthChart";
import styles from "./PatientStats.module.css";

export default function PatientStats({
    pacientesPorCitas,
    pacientesPorEdad,
    pacientesPorMes,
    pacientesPorCantidadCitas,
    pacientesActivosPorMes,
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
                    <p className={`${styles.empty} ${styles.rankingEmpty}`}>No hay pacientes con citas para mostrar.</p>
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
                    <p className={`${styles.empty} ${styles.demographicEmpty}`}>No hay rangos de edad para mostrar.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Pacientes registrados por mes</h3>
                    <p>Evolución mensual del registro de nuevos pacientes.</p>
                </div>

                {pacientesPorMes?.length ? (
                    <PatientsByMonthChart data={pacientesPorMes} />
                ) : (
                    <p className={`${styles.empty} ${styles.trendEmpty}`}>No hay registros mensuales para mostrar.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Pacientes activos por mes</h3>
                    <p>Pacientes únicos que generaron al menos una cita durante cada mes.</p>
                </div>

                {pacientesActivosPorMes?.length ? (
                    <ActivePatientsByMonthChart data={pacientesActivosPorMes} />
                ) : (
                    <p className={`${styles.empty} ${styles.activeTrendEmpty}`}>
                        No hay datos de pacientes activos para mostrar.
                    </p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Distribución por cantidad de citas</h3>
                    <p>Pacientes agrupados según la cantidad de citas registradas.</p>
                </div>

                {pacientesPorCantidadCitas?.length ? (
                    <PatientsByAppointmentCountChart data={pacientesPorCantidadCitas} />
                ) : (
                    <p className={`${styles.empty} ${styles.frequencyEmpty}`}>
                        No hay datos de cantidad de citas para mostrar.
                    </p>
                )}
            </article>
        </section>
    );
}
