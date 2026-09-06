import { AlertCircle, RefreshCw, SearchX, Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import DoctorCard from "../DoctorCard/DoctorCard";
import styles from "./DoctorsList.module.css";

export default function DoctorsList({
    doctores = [],
    loading = false,
    error = null,
    onRetry,
}) {
    const countLabel = loading
        ? "Consultando directorio"
        : error
            ? "Directorio no disponible"
            : `${doctores.length} en el directorio`;

    return (
        <section className={styles.section} aria-labelledby="doctors-list-title">
            <div className={styles.heading}>
                <div>
                    <p>Profesionales en DocSmart</p>
                    <h2 id="doctors-list-title">Elige quién cuidará de tu salud</h2>
                </div>
                <span><Stethoscope size={16} />{countLabel}</span>
            </div>

            {loading ? (
                <div className={styles.loading} role="status" aria-live="polite" aria-label="Cargando médicos">
                    {[1, 2, 3].map((item) => <span key={item} className={styles.skeleton} />)}
                </div>
            ) : error ? (
                <div className={styles.empty} role="alert">
                    <span className={styles.errorIcon}><AlertCircle size={31} aria-hidden="true" /></span>
                    <h3>No pudimos cargar el directorio</h3>
                    <p>{error} Revisa tu conexión e inténtalo nuevamente.</p>
                    {onRetry && (
                        <Button onClick={onRetry}>
                            <RefreshCw size={17} aria-hidden="true" /> Reintentar
                        </Button>
                    )}
                </div>
            ) : doctores.length > 0 ? (
                <div className={styles.list}>
                    {doctores.map((doctor) => (
                        <DoctorCard
                            key={doctor.id}
                            doctor={doctor}
                        />
                    ))}
                </div>
            ) : (
                <div className={styles.empty} role="status">
                    <span><SearchX size={31} aria-hidden="true" /></span>
                    <h3>Aún no hay médicos en el directorio</h3>
                    <p>Cuando haya profesionales disponibles en DocSmart, aparecerán aquí.</p>
                </div>
            )}
        </section>
    );
}
