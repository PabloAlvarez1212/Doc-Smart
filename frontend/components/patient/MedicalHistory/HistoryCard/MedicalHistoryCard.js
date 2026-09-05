import { CalendarDays, ChevronRight, ClipboardPlus, Stethoscope } from "lucide-react";
import styles from "./MedicalHistoryCard.module.css";

const formatDate = (date) => new Intl.DateTimeFormat("es-CO", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
}).format(new Date(`${date}T12:00:00Z`));

export default function MedicalHistoryCard({ record, isLatest, onSelect }) {
    return (
        <article className={styles.entry}>
            <span className={styles.marker} aria-hidden="true" />
            <button type="button" className={styles.card} onClick={onSelect} aria-label={`Ver consulta del ${formatDate(record.fecha_creacion)}`}>
                <div className={styles.topline}>
                    <div className={styles.date}><CalendarDays size={18} /><time>{formatDate(record.fecha_creacion)}</time></div>
                    {isLatest && <span className={styles.latest}>Más reciente</span>}
                </div>
                <div className={styles.doctor}>
                    <span><Stethoscope size={20} /></span>
                    <div><strong>{record.medico}</strong><small>{record.especialidad} · Cita #{record.cita_id}</small></div>
                </div>
                <div className={styles.clinicalData}>
                    <div><span>Motivo de consulta</span><p>{record.motivo_consulta}</p></div>
                    <div><span>Diagnóstico general</span><p>{record.diagnostico_general}</p></div>
                </div>
                <span className={styles.action}><ClipboardPlus size={17} /> Ver detalle <ChevronRight size={17} /></span>
            </button>
        </article>
    );
}
