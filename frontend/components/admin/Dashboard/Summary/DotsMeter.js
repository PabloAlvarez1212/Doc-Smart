import styles from "./Meters.module.css";

/**
 * Un punto por paciente: los primeros `active` rellenos.
 *
 * @param {{ active: number, total: number, label: string }} props
 */
export default function DotsMeter({ active, total, label }) {
    return (
        <div className={styles.dots} role="img" aria-label={label}>
            {Array.from({ length: total }, (_, index) => (
                <span
                    key={index}
                    className={`${styles.dot} ${index < active ? styles.dotActive : ""}`}
                />
            ))}
        </div>
    );
}
