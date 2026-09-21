"use client"
import styles from "./AdminMetricCard.module.css";

export default function AdminMetricCard({
    label,
    value,
    icon: Icon,
    status = "available",
    tone = "blue",
    variation,
    comparisonLabel,
}) {
    const hasValue = value !== null && value !== undefined;
    const isLoading = status === "loading";
    const isAvailable = status === "available" && hasValue;
    const accessibleValue = isLoading ? "cargando" : (isAvailable ? value : "dato no disponible");

    return (
        <article
            className={`${styles.card} ${styles[tone] ?? styles.blue}`}
            aria-label={`${label}: ${accessibleValue}`}
        >
            <div className={styles.header}>
                <span className={styles.label}>{label}</span>
                <span className={styles.icon} aria-hidden="true">
                    {Icon && <Icon size={20} strokeWidth={1.9} />}
                </span>
            </div>

            {isLoading ? (
                <div className={styles.skeleton} aria-hidden="true" />
            ) : (
                <strong className={`${styles.value} ${!isAvailable ? styles.unavailableValue : ""}`}>
                    {isAvailable ? value : "—"}
                </strong>
            )}

            <div className={styles.footer}>
                {isAvailable && variation !== null && variation !== undefined ? (
                    <>
                        <span
                            className={
                                variation >= 0
                                    ? styles.positive
                                    : styles.negative
                            }
                        >
                            {variation >= 0 ? "+" : ""}
                            {variation}%
                        </span>

                        {comparisonLabel && (
                            <span>{comparisonLabel}</span>
                        )}
                    </>
                ) : (
                    <span>
                        {isLoading
                            ? "Cargando información"
                            : isAvailable
                                ? "Datos actuales"
                                : "Dato no disponible"}
                    </span>
                )}
            </div>
        </article>
    );
}
