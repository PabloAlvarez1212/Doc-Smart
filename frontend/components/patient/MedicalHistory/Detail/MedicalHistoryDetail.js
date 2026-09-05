import { AlertTriangle, CalendarDays, Clock3, ClipboardList, Printer, RefreshCw, Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import styles from "./MedicalHistoryDetail.module.css";
import { formatMedicalHistoryDate, formatMedicalHistoryTime } from "../medicalHistoryFormatters";

export default function MedicalHistoryDetail({ record, loading, error, onRetry }) {
    if (loading) {
        return (
            <div className={styles.detailLoading} role="status" aria-live="polite">
                <span className={styles.spinner} aria-hidden="true" />
                <p>Cargando el registro clínico…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.detailError} role="alert">
                <AlertTriangle size={30} aria-hidden="true" />
                <h3>No pudimos abrir este registro</h3>
                <p>{error}</p>
                <Button onClick={onRetry}><RefreshCw size={18} /> Intentar nuevamente</Button>
            </div>
        );
    }

    return (
        <article className={styles.detail}>
            <div className={styles.dateBand}>
                <div><CalendarDays size={20} /><strong>{formatMedicalHistoryDate(record.fecha_creacion)}</strong></div>
                <div><Clock3 size={18} /><span>{formatMedicalHistoryTime(record.fecha_creacion)}</span></div>
            </div>
            <div className={styles.doctor}>
                <span><Stethoscope size={23} /></span>
                <div><strong>{record.medico}</strong><p>{record.especialidad}</p></div>
            </div>
            <dl className={styles.sections}>
                <div><dt>Motivo de consulta</dt><dd>{record.motivo_consulta}</dd></div>
                <div><dt>Diagnóstico general</dt><dd>{record.diagnostico_general}</dd></div>
                <div><dt>Observaciones</dt><dd>{record.observaciones || "Sin observaciones adicionales."}</dd></div>
            </dl>
            <div className={styles.note}><ClipboardList size={19} aria-hidden="true" /><p>Registro clínico versionado. Estás viendo la versión {record.version_actual}.</p></div>
            <Button className={styles.print} variant="secundary" onClick={() => window.print()}><Printer size={18} /> Imprimir resumen</Button>
        </article>
    );
}
