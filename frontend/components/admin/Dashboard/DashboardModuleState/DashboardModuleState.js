import { CircleAlert } from "lucide-react";
import styles from "./DashboardModuleState.module.css";

export default function DashboardModuleState({
    loading = false,
    error = false,
    cardCount = 4,
    moduleName,
}) {
    if (loading) {
        return (
            <div
                className={styles.loadingGrid}
                role="status"
                aria-live="polite"
                aria-label={`Cargando estadísticas de ${moduleName}`}
            >
                {Array.from({ length: cardCount }, (_, index) => (
                    <div className={styles.skeletonCard} key={index} aria-hidden="true">
                        <span className={styles.skeletonTitle} />
                        <span className={styles.skeletonDescription} />
                        <span className={styles.skeletonChart} />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorState} role="alert">
                <span className={styles.errorIcon} aria-hidden="true">
                    <CircleAlert size={22} strokeWidth={1.9} />
                </span>
                <div>
                    <h3>No fue posible cargar las estadísticas</h3>
                    <p>Intenta actualizar la página en unos momentos.</p>
                </div>
            </div>
        );
    }

    return null;
}
