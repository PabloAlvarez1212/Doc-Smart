import DashboardModuleState from "../../DashboardModuleState/DashboardModuleState";
import ActivePatientsByMonthChart from "../ActivePatientsByMonthChart";
import PatientsByAgeChart from "../PatientsByAgeChart";
import PatientsByAppointmentCountChart from "../PatientsByAppointmentCountChart";
import PatientsByMonthChart from "../PatientsByMonthChart";
import styles from "./PatientStats.module.css";

export default function PatientStats({
    pacientesPorEdad,
    pacientesPorMes,
    pacientesPorCantidadCitas,
    pacientesActivosPorMes,
    loading = false,
    error = false,
}) {
    if (loading || error) {
        return (
            <DashboardModuleState
                loading={loading}
                error={error}
                cardCount={4}
                moduleName="pacientes"
            />
        );
    }

    return (
        <section className={styles.stats} aria-label="Estadísticas de pacientes">
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

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Distribución por cantidad de citas</h3>
                    <p>Pacientes agrupados según la cantidad de citas registradas.</p>
                </div>

                {pacientesPorCantidadCitas?.length ? (
                    <PatientsByAppointmentCountChart data={pacientesPorCantidadCitas} />
                ) : (
                    <p className={styles.empty}>No hay datos de cantidad de citas para mostrar.</p>
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
                    <p className={styles.empty}>No hay registros mensuales para mostrar.</p>
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
                    <p className={styles.empty}>No hay datos de pacientes activos para mostrar.</p>
                )}
            </article>
        </section>
    );
}
