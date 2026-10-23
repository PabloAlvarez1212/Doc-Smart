import { AlertCircle, RefreshCw, Star } from "lucide-react";
import EstrellasCalificacion from "../../../patient/Calificaciones/EstrellasCalificacion/EstrellasCalificacion";
import { formatPromedioCalificaciones } from "../../../patient/Calificaciones/medicoCalificacionesModel";
import styles from "./RatingSummary.module.css";

export default function RatingSummary({
    resumen,
    loading = false,
    error = null,
    onRetry,
    compact = false,
    title = "Calificación de pacientes",
    emptyMessage = "Aún no tienes calificaciones.",
}) {
    const total = resumen?.totalCalificaciones || 0;
    const promedio = resumen?.promedio || 0;

    return (
        <section className={`${styles.card} ${compact ? styles.compact : ""}`} aria-labelledby="rating-summary-title">
            <div className={styles.heading}>
                <span className={styles.icon} aria-hidden="true"><Star size={19} /></span>
                <div>
                    <h2 id="rating-summary-title">{title}</h2>
                    <p>Opiniones de pacientes después de una atención completada.</p>
                </div>
            </div>

            {loading ? (
                <div className={styles.skeleton} role="status" aria-label="Cargando calificaciones">
                    <span /><span /><span />
                </div>
            ) : error ? (
                <div className={styles.feedback} role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    <span>{error}</span>
                    {onRetry && <button type="button" onClick={onRetry}><RefreshCw size={15} />Reintentar</button>}
                </div>
            ) : total > 0 ? (
                <div className={styles.metric}>
                    <strong>{formatPromedioCalificaciones(promedio)} <small>/ 5</small></strong>
                    <EstrellasCalificacion value={promedio} readOnly />
                    <p>Basado en {total} {total === 1 ? "valoración" : "valoraciones"}.</p>
                </div>
            ) : (
                <div className={styles.empty}>
                    <Star size={22} aria-hidden="true" />
                    <p>{emptyMessage}</p>
                </div>
            )}
        </section>
    );
}
