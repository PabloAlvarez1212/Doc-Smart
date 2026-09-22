"use client";

import styles from "./DoctorStats.module.css";
import DoctorsBySpecialtyChart from "../DoctorsBySpecialtyChart";
import DoctorsValidationStatusChart from "../DoctorsValidationStatusChart";
import ValidationRequestsByMonthChart from "../ValidationRequestsByMonthChart";

export default function DoctorStats({
    medicosPorEspecialidad,
    medicosPorEstadoValidacion,
    solicitudesValidacionPorMes
}) {
    return (
        <section className={styles.stats} aria-label="Estadísticas de médicos">
            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Médicos por especialidad</h3>
                    <p>
                        Distribución de los médicos aprobados según
                        su especialidad.
                    </p>
                </div>

                {medicosPorEspecialidad?.length ? (
                    <DoctorsBySpecialtyChart data={medicosPorEspecialidad} />
                ) : (
                    <p className={styles.empty}>No hay médicos aprobados para mostrar.</p>
                )}
            </article>

            <article className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <h3>Estado de validación</h3>
                    <p>
                        Estado actual del proceso de validación de
                        los médicos registrados.
                    </p>
                </div>

                {medicosPorEstadoValidacion?.length ? (
                    <DoctorsValidationStatusChart data={medicosPorEstadoValidacion} />
                ) : (
                    <p className={styles.empty}>No hay estados de validación para mostrar.</p>
                )}
            </article>

            <article
                className={`${styles.chartCard} ${styles.fullWidth}`}
            >
                <div className={styles.chartHeader}>
                    <h3>Solicitudes de validación</h3>
                    <p>
                        Cantidad de solicitudes de validación
                        registradas por mes.
                    </p>
                </div>

                {solicitudesValidacionPorMes?.length ? (
                    <ValidationRequestsByMonthChart data={solicitudesValidacionPorMes} />
                ) : (
                    <p className={styles.empty}>No hay solicitudes de validación para mostrar.</p>
                )}
            </article>
        </section>
    );
}
