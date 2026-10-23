export function normalizeRating(value) {
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0;
}

export function normalizeDisplayRating(value) {
    const rating = Number(value);
    if (!Number.isFinite(rating)) return 0;
    return Math.min(5, Math.max(0, rating));
}

export function getStarFillPercentage(value, score) {
    const rating = normalizeDisplayRating(value);
    return Math.round(Math.min(1, Math.max(0, rating - (score - 1))) * 100);
}

export function getStarOptions(value, previewValue = 0) {
    const selectedValue = normalizeRating(value);
    const activeValue = normalizeRating(previewValue) || selectedValue;

    return Array.from({ length: 5 }, (_, index) => {
        const score = index + 1;
        return {
            score,
            label: `${score} ${score === 1 ? "estrella" : "estrellas"}`,
            active: score <= activeValue,
            selected: score === selectedValue,
        };
    });
}

export function ratingDescription(value) {
    const rating = normalizeRating(value);

    if (!rating) return "Aún no has seleccionado una puntuación.";

    return `${rating} de 5 estrellas ${rating === 1 ? "seleccionada" : "seleccionadas"}.`;
}
