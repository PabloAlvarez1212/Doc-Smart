import { buildDelta } from "./summaryComparison";
import styles from "./DeltaBadge.module.css";

/**
 * Variación de una métrica frente al mismo tramo del mes anterior. Siempre lleva flecha
 * y signo, no solo color.
 *
 * @param {{ metrica: object|undefined, detalle?: string }} props
 * `detalle` aclara qué se compara; se muestra y se lee en voz alta.
 */
export default function DeltaBadge({ metrica, detalle }) {
    const delta = buildDelta(metrica, detalle);

    return (
        <span className={`${styles.delta} ${styles[delta.estado]}`}>
            <span className={styles.srOnly}>{delta.etiquetaAccesible}</span>
            <span aria-hidden="true">
                {delta.flecha && <span className={styles.arrow}>{delta.flecha}</span>}
                {delta.valor && <strong>{delta.valor}</strong>}
                {delta.texto && <span>{delta.texto}</span>}
                {delta.aclaracion && <span>· {delta.aclaracion}</span>}
            </span>
        </span>
    );
}
