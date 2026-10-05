"use client";

import DashboardModuleState from "../../DashboardModuleState/DashboardModuleState";
import DashboardPeriodFilters from "../../DashboardPeriodFilters/DashboardPeriodFilters";
import PatientsByAgeChart from "../PatientsByAgeChart";
import PatientsByAppointmentCountChart from "../PatientsByAppointmentCountChart";
import PatientsPeriodLineChart from "../PatientsPeriodLineChart";
import styles from "./PatientStats.module.css";

function hasPositivePatientTotal(data) {
    return Array.isArray(data)
        && data.some((item) => Number(item?.total_pacientes) > 0);
}

export default function PatientStats({
    pacientesPorEdad,
    pacientesRegistradosPorPeriodo,
    pacientesPorCantidadCitas,
    pacientesActivosPorPeriodo,
    filtros,
    cambiarAnio,
    cambiarMes,
    loading = false,
    error = false,
}) {
    const registeredGrouping = pacientesRegistradosPorPeriodo?.agrupacion === "dia"
        ? "dia"
        : "mes";
    const registeredPatients = Array.isArray(pacientesRegistradosPorPeriodo?.datos)
        ? pacientesRegistradosPorPeriodo.datos
        : [];
    const activeGrouping = pacientesActivosPorPeriodo?.agrupacion === "dia"
        ? "dia"
        : "mes";
    const activePatients = Array.isArray(pacientesActivosPorPeriodo?.datos)
        ? pacientesActivosPorPeriodo.datos
        : [];
    const hasAgeData = hasPositivePatientTotal(pacientesPorEdad);
    const hasAppointmentCountData = hasPositivePatientTotal(pacientesPorCantidadCitas);

    return (
        <section className={styles.patients} aria-label="Estadísticas de pacientes">
            <DashboardPeriodFilters
                filters={filtros}
                onYearChange={cambiarAnio}
                onMonthChange={cambiarMes}
                moduleName="pacientes"
                idPrefix="patients"
                loading={loading}
            />

            {loading || error ? (
                <DashboardModuleState
                    loading={loading}
                    error={error}
                    cardCount={4}
                    moduleName="pacientes"
                />
            ) : (
                <div className={styles.stats}>
                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Pacientes por edad</h3>
                            <p>Distribución por edad de los pacientes al cierre del período seleccionado.</p>
                        </div>

                        {hasAgeData ? (
                            <PatientsByAgeChart data={pacientesPorEdad} />
                        ) : (
                            <p className={styles.empty}>No hay pacientes al cierre del período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>Distribución por cantidad de citas</h3>
                            <p>Distribución de pacientes según la cantidad de citas programadas en el período seleccionado.</p>
                        </div>

                        {hasAppointmentCountData ? (
                            <PatientsByAppointmentCountChart data={pacientesPorCantidadCitas} />
                        ) : (
                            <p className={styles.empty}>No hay pacientes para clasificar en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>{`Pacientes registrados por ${registeredGrouping === "dia" ? "día" : "mes"}`}</h3>
                            <p>Pacientes registrados durante el período seleccionado.</p>
                        </div>

                        {registeredPatients.length ? (
                            <PatientsPeriodLineChart
                                data={registeredPatients}
                                grouping={registeredGrouping}
                                kind="registered"
                            />
                        ) : (
                            <p className={styles.empty}>No hay pacientes registrados en el período seleccionado.</p>
                        )}
                    </article>

                    <article className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3>{`Pacientes activos por ${activeGrouping === "dia" ? "día" : "mes"}`}</h3>
                            <p>Pacientes con citas programadas durante el período seleccionado.</p>
                        </div>

                        {activePatients.length ? (
                            <PatientsPeriodLineChart
                                data={activePatients}
                                grouping={activeGrouping}
                                kind="active"
                            />
                        ) : (
                            <p className={styles.empty}>No hay pacientes activos en el período seleccionado.</p>
                        )}
                    </article>
                </div>
            )}
        </section>
    );
}
