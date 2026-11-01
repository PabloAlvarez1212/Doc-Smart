import styles from "./Meters.module.css";

/**
 * Barra segmentada de proporción: `value` de `total`.
 *
 * @param {{ value: number, total: number, tone?: "red"|"blue", label: string }} props
 */
export default function MeterBar({ value, total, tone = "red", label }) {
    const rest = Math.max(total - value, 0);

    return (
        <div className={styles.bar} role="img" aria-label={label}>
            {value > 0 && (
                <span
                    className={`${styles.barFill} ${tone === "blue" ? styles.blue : styles.red}`}
                    style={{ flexGrow: value }}
                />
            )}
            {rest > 0 && <span className={styles.barRest} style={{ flexGrow: rest }} />}
        </div>
    );
}
