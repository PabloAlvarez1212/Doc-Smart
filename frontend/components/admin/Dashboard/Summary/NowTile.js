import styles from "./NowTile.module.css";

function CheckIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2.5 6.4 5 8.8l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 2.2v4.3M6 9.4v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Tile protagonista del grupo "Ahora".
 *
 * @param {{
 *   label: string,
 *   value: string,
 *   tone?: "info"|"ok"|"alert",
 *   pill?: string,
 *   context?: string,
 *   loading?: boolean
 * }} props
 */
export default function NowTile({ label, value, tone = "info", pill, context, loading = false }) {
    const isEmpty = value === "—";

    return (
        <article className={`${styles.tile} ${styles[tone] ?? styles.info}`}>
            <span className={styles.strip} aria-hidden="true" />
            <h4 className={styles.label}>{label}</h4>
            {loading ? (
                <>
                    <span className={`${styles.skeleton} ${styles.skeletonValue}`} aria-hidden="true" />
                    <span className={`${styles.skeleton} ${styles.skeletonText}`} aria-hidden="true" />
                </>
            ) : (
                <>
                    <p className={`${styles.value} ${isEmpty ? styles.empty : ""}`}>{value}</p>
                    {pill && (
                        <span className={styles.pill}>
                            {tone === "ok" ? <CheckIcon /> : <AlertIcon />}
                            {pill}
                        </span>
                    )}
                    {context && <p className={styles.context}>{context}</p>}
                </>
            )}
        </article>
    );
}
