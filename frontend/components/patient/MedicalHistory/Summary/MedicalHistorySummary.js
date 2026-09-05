import { CalendarDays, Stethoscope, TimerReset } from "lucide-react";
import styles from "./MedicalHistorySummary.module.css";

const formatShortDate = (date) => new Intl.DateTimeFormat("es-CO", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
}).format(new Date(`${date}T12:00:00Z`));

export default function MedicalHistorySummary({ records }) {
    const professionals = new Set(records.map((record) => record.medico)).size;
    const items = [
        { icon: CalendarDays, label: "Consultas registradas", value: records.length },
        { icon: TimerReset, label: "Última consulta", value: formatShortDate(records[0].fecha_creacion) },
        { icon: Stethoscope, label: "Profesionales", value: professionals },
    ];
    return (
        <section className={styles.summary} aria-label="Resumen del historial">
            {items.map(({ icon: Icon, label, value }) => (
                <article key={label} className={styles.item}>
                    <span className={styles.icon}><Icon size={21} aria-hidden="true" /></span>
                    <div><span>{label}</span><strong>{value}</strong></div>
                </article>
            ))}
        </section>
    );
}
