import styles from "./Meters.module.css";

const STAR_PATH = "M8 1.6l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.5l-3.9 2.2.8-4.4L1.7 6.2l4.4-.6z";

/**
 * Cinco estrellas decorativas; el valor ya está en texto junto a ellas.
 *
 * @param {{ average: number|null }} props
 */
export default function StarsMeter({ average }) {
    const filled = average === null || average === undefined
        ? 0
        : Math.min(5, Math.max(0, Math.round(average)));

    return (
        <div className={styles.stars} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
                <svg key={index} width="16" height="16" viewBox="0 0 16 16">
                    <path
                        d={STAR_PATH}
                        className={index < filled ? styles.starFilled : styles.starEmpty}
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                    />
                </svg>
            ))}
        </div>
    );
}
