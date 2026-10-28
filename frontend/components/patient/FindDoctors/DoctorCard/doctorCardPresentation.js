export function getDoctorRatingPresentation(doctor) {
    const average = Number(doctor?.promedio_calificacion);
    const total = Number(doctor?.total_calificaciones);
    const hasRatings = (
        Number.isFinite(average) &&
        average >= 1 &&
        average <= 5 &&
        Number.isInteger(total) &&
        total > 0
    );

    if (!hasRatings) {
        return {
            hasRatings: false,
            averageValue: null,
            averageLabel: null,
            opinionsLabel: "Sin valoraciones",
        };
    }

    return {
        hasRatings: true,
        averageValue: average,
        averageLabel: average.toFixed(1),
        opinionsLabel: `${total} ${total === 1 ? "opinión" : "opiniones"}`,
    };
}
