import { CalendarDays, ChevronRight, ClipboardPlus, Stethoscope } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import AppointmentCode from "../../../ui/AppointmentCode/AppointmentCode";
import styles from "./MedicalHistoryCard.module.css";
import { formatMedicalHistoryDate } from "../medicalHistoryFormatters";

export default function MedicalHistoryCard({ record, isLatest, onSelect }) {
    const reduceMotion = useReducedMotion();
    return (
        <article className={styles.entry}>
            <span className={styles.marker} aria-hidden="true" />
            <div className={styles.card}>
                <div className={styles.topline}>
                    <div className={styles.date}><CalendarDays size={18} /><time dateTime={record.fecha_creacion}>{formatMedicalHistoryDate(record.fecha_creacion)}</time></div>
                    {isLatest && <span className={styles.latest}>Más reciente</span>}
                </div>
                <div className={styles.doctor}>
                    <span><Stethoscope size={20} /></span>
                    <div><strong>{record.medico}</strong><small>{record.especialidad}</small></div>
                </div>
                <div className={styles.clinicalData}>
                    <div><span>Motivo de consulta</span><p>{record.motivo_consulta}</p></div>
                    <div><span>Diagnóstico general</span><p>{record.diagnostico_general}</p></div>
                </div>
                <AppointmentCode
                    value={record.codigo_cita}
                    contextId={record.id}
                    compact
                />
                <motion.button
                    type="button"
                    className={styles.action}
                    onClick={onSelect}
                    initial="rest"
                    whileHover="hover"
                    whileFocus="hover"
                    aria-label={`Ver detalles de la consulta del ${formatMedicalHistoryDate(record.fecha_creacion)}`}
                >
                    <ClipboardPlus size={17} aria-hidden="true" />
                    Ver detalles
                    <motion.span aria-hidden="true" style={{ display: "inline-flex" }} variants={{ rest: { x: 0 }, hover: { x: reduceMotion ? 0 : 3 } }} transition={{ duration: .18, ease: "easeOut" }}><ChevronRight size={17} /></motion.span>
                </motion.button>
            </div>
        </article>
    );
}
