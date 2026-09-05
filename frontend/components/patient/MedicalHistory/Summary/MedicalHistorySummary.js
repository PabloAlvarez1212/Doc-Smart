import { CalendarDays, Stethoscope, TimerReset } from "lucide-react";
import styles from "./MedicalHistorySummary.module.css";
import { formatMedicalHistoryDate } from "../medicalHistoryFormatters";

export default function MedicalHistorySummary({ records, total, latestRecord, loading = false }) {
    const professionals = new Set(records.map((record) => record.medico)).size;
    const items = [
        { icon: CalendarDays, label: "Consultas registradas", value: loading ? "—" : total },
        {
            icon: TimerReset,
            label: "Última consulta",
            value: loading
                ? "Cargando…"
                : latestRecord
                    ? formatMedicalHistoryDate(latestRecord.fecha_creacion, true)
                    : "Sin registros",
        },
        {
            icon: Stethoscope,
            label: "Profesionales en esta página",
            value: loading ? "—" : professionals,
        },
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
