"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";
import {
    getStarOptions,
    getStarFillPercentage,
    normalizeDisplayRating,
    normalizeRating,
    ratingDescription,
} from "./starRatingModel";
import styles from "./EstrellasCalificacion.module.css";

export default function EstrellasCalificacion({
    value,
    onChange,
    readOnly = false,
    disabled = false,
    name = "puntuacion",
    labelledBy,
}) {
    const groupId = useId();
    const [previewValue, setPreviewValue] = useState(0);
    const rating = normalizeRating(value);
    const options = getStarOptions(rating, previewValue);
    const description = ratingDescription(rating);

    if (readOnly) {
        const displayRating = normalizeDisplayRating(value);
        return (
            <div
                className={`${styles.root} ${styles.readOnly}`}
                role="img"
                aria-label={`Puntuación registrada: ${displayRating} de 5 estrellas`}
            >
                <div className={styles.stars} aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((score) => (
                        <span className={styles.readOnlyStar} key={score}>
                            <Star className={styles.inactiveStar} />
                            <span
                                className={styles.starFill}
                                style={{ width: `${getStarFillPercentage(displayRating, score)}%` }}
                            >
                                <Star className={styles.activeStar} fill="currentColor" />
                            </span>
                        </span>
                    ))}
                </div>
                <span className={styles.description}>{displayRating.toFixed(1)} de 5 estrellas</span>
            </div>
        );
    }

    const legendId = `${groupId}-legend`;

    return (
        <fieldset
            className={styles.root}
            aria-labelledby={labelledBy ? `${labelledBy} ${legendId}` : legendId}
            disabled={disabled}
            onMouseLeave={() => setPreviewValue(0)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setPreviewValue(0);
            }}
        >
            <legend id={legendId} className={styles.srOnly}>Puntuación de la atención</legend>
            <div className={styles.stars}>
                {options.map((option) => {
                    const inputId = `${groupId}-${option.score}`;
                    return (
                        <span key={option.score} className={styles.option}>
                            <input
                                id={inputId}
                                className={styles.input}
                                type="radio"
                                name={name}
                                value={option.score}
                                checked={option.selected}
                                aria-label={option.label}
                                onChange={() => onChange?.(option.score)}
                                onFocus={() => setPreviewValue(option.score)}
                            />
                            <label
                                className={`${styles.starButton} ${option.active ? styles.active : ""}`}
                                htmlFor={inputId}
                                aria-label={option.label}
                                title={option.label}
                                onMouseEnter={() => setPreviewValue(option.score)}
                            >
                                <Star fill={option.active ? "currentColor" : "none"} aria-hidden="true" />
                            </label>
                        </span>
                    );
                })}
            </div>
            <span className={styles.description} aria-live="polite">{description}</span>
        </fieldset>
    );
}
