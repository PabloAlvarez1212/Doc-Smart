import { CalendarCheck2, CalendarClock, CalendarDays, CalendarX2 } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { getContentTransition } from "../patientHomeMotion";
import styles from "./StaticCards.module.css";

export default function StaticCards({
    dashboard,
    cantidadProximasCitas,
    consultasPendientes,
    consultasRealizadas,
    consultasCanceladas,
}) {
    const reduceMotion = useReducedMotion();
    const statistics = dashboard?.estadisticas ?? {};
    const items = [
        { label: "Próximas", detail: "Confirmadas", value: cantidadProximasCitas ?? statistics.cantidad_proximas_citas ?? 0, icon: CalendarDays, tone: "blue" },
        { label: "Pendientes", detail: "Por confirmar", value: consultasPendientes ?? statistics.consultas_pendientes ?? 0, icon: CalendarClock, tone: "amber" },
        { label: "Completadas", detail: "Este mes", value: consultasRealizadas ?? statistics.consultas_realizadas_mes ?? 0, icon: CalendarCheck2, tone: "green" },
        { label: "Canceladas", detail: "Este mes", value: consultasCanceladas ?? statistics.consultas_canceladas_mes ?? 0, icon: CalendarX2, tone: "red" },
    ];

    return (
        <section className={styles.summary} aria-labelledby="appointment-summary-title">
            <div className={styles.heading}>
                <h2 id="appointment-summary-title">Tu agenda en cifras</h2>
                <p>Un vistazo rápido al estado de tus citas.</p>
            </div>
            <div className={styles.metrics}>
                {items.map(({ label, detail, value, icon: Icon, tone }) => {
                    const normalizedValue = Math.max(0, Number(value) || 0);
                    return (
                        <div className={styles.metric} key={label}>
                            <span className={`${styles.icon} ${styles[tone]}`} aria-hidden="true"><Icon size={19} /></span>
                            <span className={styles.label}><strong>{label}</strong><small>{detail}</small></span>
                            <m.strong
                                className={styles.value}
                                key={`${label}-${normalizedValue}`}
                                {...getContentTransition(reduceMotion)}
                            >
                                {normalizedValue}
                            </m.strong>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
