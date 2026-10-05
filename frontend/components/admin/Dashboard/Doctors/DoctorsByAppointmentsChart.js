"use client";

import styles from "./DoctorStats/DoctorStats.module.css";

export default function DoctorsByAppointmentsChart({ data }) {
    const ranking = data.map((item) => ({
        ...item,
        total_citas: Math.max(0, Number(item.total_citas) || 0),
    }));
    const maxAppointments = Math.max(1, ...ranking.map((item) => item.total_citas));

    return (
        <ol className={styles.doctorRanking} aria-label="Ranking de médicos por citas completadas">
            {ranking.map((item, index) => {
                const completedAppointments = item.total_citas;
                const progress = (completedAppointments / maxAppointments) * 100;

                return (
                    <li
                        className={styles.doctorRankingItem}
                        key={`${item.medico}-${index}`}
                        aria-label={`${index + 1}. ${item.medico}: ${completedAppointments} ${completedAppointments === 1 ? "cita completada" : "citas completadas"}`}
                    >
                        <span className={styles.rankingPosition} aria-hidden="true">
                            {index + 1}
                        </span>
                        <span className={styles.rankingDoctor} title={item.medico}>
                            {item.medico}
                        </span>
                        <span className={styles.rankingValue} aria-hidden="true">
                            <strong>{completedAppointments}</strong>
                            <small>{completedAppointments === 1 ? "cita" : "citas"}</small>
                        </span>
                        <span className={styles.rankingTrack} aria-hidden="true">
                            <span
                                className={styles.rankingFill}
                                style={{ width: `${progress}%` }}
                            />
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
