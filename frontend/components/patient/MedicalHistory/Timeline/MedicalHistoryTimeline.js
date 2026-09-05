import { AlertTriangle, ClipboardList, RefreshCw, SearchX } from "lucide-react";
import Button from "../../../ui/Button/Button";
import MedicalHistoryCard from "../HistoryCard/MedicalHistoryCard";
import styles from "./MedicalHistoryTimeline.module.css";

export default function MedicalHistoryTimeline({
    records,
    hasFilters,
    loading,
    error,
    latestRecordId,
    onRetry,
    onSelect,
    onReset,
}) {
    return (
        <section className={styles.section} aria-labelledby="timeline-title">
            <div className={styles.header}>
                <div><p className={styles.kicker}>Registro de atenciones</p><h2 id="timeline-title">Historial cronológico</h2></div>
                <span>{loading ? "Actualizando…" : `${records.length} ${records.length === 1 ? "resultado" : "resultados"}`}</span>
            </div>
            {loading ? (
                <div className={styles.loading} role="status" aria-live="polite" aria-label="Cargando historial clínico">
                    {[1, 2, 3].map((item) => <span key={item} className={styles.skeleton} />)}
                </div>
            ) : error ? (
                <div className={styles.empty} role="alert">
                    <span className={styles.errorIcon}><AlertTriangle size={29} aria-hidden="true" /></span>
                    <h3>No pudimos cargar tu historial</h3>
                    <p>{error}</p>
                    <Button onClick={onRetry}><RefreshCw size={18} /> Intentar nuevamente</Button>
                </div>
            ) : records.length ? (
                <div className={styles.timeline}>
                    {records.map((record) => <MedicalHistoryCard key={record.id} record={record} isLatest={record.id === latestRecordId} onSelect={() => onSelect(record)} />)}
                </div>
            ) : (
                <div className={styles.empty}>
                    <span><SearchX size={29} aria-hidden="true" /></span>
                    <h3>{hasFilters ? "No encontramos coincidencias" : "Aún no tienes registros"}</h3>
                    <p>{hasFilters ? "Prueba con otro término o restablece los filtros para ver todo tu historial." : "Cuando un médico registre una atención, aparecerá aquí."}</p>
                    {hasFilters && <Button onClick={onReset}><ClipboardList size={18} /> Ver todo el historial</Button>}
                </div>
            )}
        </section>
    );
}
