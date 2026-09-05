import { CalendarDays, Clock3, ClipboardList, Printer, Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import styles from "./MedicalHistoryDetail.module.css";

const formatDate = (date) => new Intl.DateTimeFormat("es-CO", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
}).format(new Date(`${date}T12:00:00Z`));

export default function MedicalHistoryDetail({ record }) {
    return (
        <article className={styles.detail}>
            <div className={styles.dateBand}>
                <div><CalendarDays size={20} /><strong>{formatDate(record.fecha_creacion)}</strong></div>
                <div><Clock3 size={18} /><span>{record.hora}</span></div>
            </div>
            <div className={styles.doctor}>
                <span><Stethoscope size={23} /></span>
                <div><strong>{record.medico}</strong><p>{record.especialidad}</p></div>
                <small>Cita #{record.cita_id}</small>
            </div>
            <dl className={styles.sections}>
                <div><dt>Motivo de consulta</dt><dd>{record.motivo_consulta}</dd></div>
                <div><dt>Diagnóstico general</dt><dd>{record.diagnostico_general}</dd></div>
                <div><dt>Observaciones</dt><dd>{record.observaciones || "Sin observaciones adicionales."}</dd></div>
            </dl>
            <div className={styles.note}><ClipboardList size={19} aria-hidden="true" /><p>Este registro fue creado por el profesional que atendió la consulta.</p></div>
            <Button className={styles.print} variant="secundary" onClick={() => window.print()}><Printer size={18} /> Imprimir resumen</Button>
        </article>
    );
}
