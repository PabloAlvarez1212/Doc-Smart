import { ClipboardList, SearchX } from "lucide-react";
import Button from "../../../ui/Button/Button";
import MedicalHistoryCard from "../HistoryCard/MedicalHistoryCard";
import styles from "./MedicalHistoryTimeline.module.css";

export default function MedicalHistoryTimeline({ records, hasFilters, onSelect, onReset }) {
    return (
        <section className={styles.section} aria-labelledby="timeline-title">
            <div className={styles.header}>
                <div><p className={styles.kicker}>Registro de atenciones</p><h2 id="timeline-title">Historial cronológico</h2></div>
                <span>{records.length} {records.length === 1 ? "resultado" : "resultados"}</span>
            </div>
            {records.length ? (
                <div className={styles.timeline}>
                    {records.map((record, index) => <MedicalHistoryCard key={record.id} record={record} isLatest={index === 0} onSelect={() => onSelect(record)} />)}
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
