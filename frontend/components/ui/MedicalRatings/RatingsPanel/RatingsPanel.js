"use client";

import { MessageSquareText } from "lucide-react";
import { useEffect, useId, useState } from "react";
import EstrellasCalificacion from "../../../patient/Calificaciones/EstrellasCalificacion/EstrellasCalificacion";
import { formatCalificacionDate } from "../../../patient/Calificaciones/calificacionPresentation";
import RatingDistribution from "../RatingDistribution/RatingDistribution";
import RatingSummary from "../RatingSummary/RatingSummary";
import styles from "./RatingsPanel.module.css";

const INITIAL_REVIEWS = 4;

export default function RatingsPanel({
    resumen,
    calificaciones = [],
    loading,
    error,
    onRetry,
    reviewsTitle = "Opiniones recibidas",
    reviewsDescription = "Comentarios registrados después de las consultas.",
    emptyReviewsMessage = "Aún no tienes calificaciones.",
}) {
    const [limite, setLimite] = useState(INITIAL_REVIEWS);
    const reviewsTitleId = useId();
    const visibles = calificaciones.slice(0, limite);

    useEffect(() => setLimite(INITIAL_REVIEWS), [calificaciones]);

    return (
        <section className={styles.panel} aria-label="Valoraciones recibidas">
            <RatingSummary resumen={resumen} loading={loading} error={error} onRetry={onRetry} />

            {!loading && !error && resumen?.totalCalificaciones > 0 && (
                <>
                    <RatingDistribution distribucion={resumen.distribucion} total={resumen.totalCalificaciones} />
                    <section className={styles.reviews} aria-labelledby={reviewsTitleId}>
                        <div className={styles.sectionHeading}>
                            <div><h2 id={reviewsTitleId}>{reviewsTitle}</h2><p>{reviewsDescription}</p></div>
                            <MessageSquareText size={20} aria-hidden="true" />
                        </div>
                        {visibles.length ? (
                            <div className={styles.reviewList}>
                                {visibles.map((calificacion) => (
                                    <article className={styles.review} key={calificacion.id}>
                                        <div className={styles.reviewHeader}>
                                            <EstrellasCalificacion value={calificacion.puntuacion} readOnly />
                                            <time dateTime={calificacion.fecha_creacion}>{formatCalificacionDate(calificacion.fecha_creacion)}</time>
                                        </div>
                                        <p>{calificacion.comentario?.trim() || "El paciente no dejó un comentario."}</p>
                                    </article>
                                ))}
                            </div>
                        ) : <p className={styles.emptyReviews}>{emptyReviewsMessage}</p>}
                        {limite < calificaciones.length && (
                            <button className={styles.moreButton} type="button" onClick={() => setLimite((current) => current + INITIAL_REVIEWS)}>Ver más opiniones</button>
                        )}
                    </section>
                </>
            )}
        </section>
    );
}
