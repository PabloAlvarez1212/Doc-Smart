"use client";

import { Star } from "lucide-react";
import { useId, useMemo } from "react";
import { buildDistribucionCalificaciones } from "../../../patient/Calificaciones/medicoCalificacionesModel";
import styles from "./RatingDistribution.module.css";

export default function RatingDistribution({ distribucion, total = 0 }) {
    const titleId = useId();
    const filas = useMemo(
        () => buildDistribucionCalificaciones(distribucion, total),
        [distribucion, total],
    );

    return (
        <section className={styles.distribution} aria-labelledby={titleId}>
            <div className={styles.sectionHeading}>
                <div>
                    <h2 id={titleId}>Distribución de valoraciones</h2>
                    <p>Cómo se reparten las puntuaciones recibidas.</p>
                </div>
                <Star size={20} aria-hidden="true" />
            </div>
            <div className={styles.bars}>
                {filas.map(({ puntuacion, cantidad, porcentaje }) => (
                    <div className={styles.barRow} key={puntuacion}>
                        <span>{puntuacion} <Star size={13} fill="currentColor" aria-hidden="true" /></span>
                        <div className={styles.track} role="img" aria-label={`${porcentaje}% de las valoraciones tienen ${puntuacion} estrellas`}>
                            <span style={{ transform: `scaleX(${porcentaje / 100})` }} />
                        </div>
                        <strong aria-label={`${cantidad} valoraciones de ${puntuacion} estrellas`}>{cantidad}</strong>
                    </div>
                ))}
            </div>
        </section>
    );
}
