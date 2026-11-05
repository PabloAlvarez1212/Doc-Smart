import { Activity, CalendarClock, CircleCheckBig, Star, TrendingDown, TrendingUp, UserRoundX, CalendarX, Minus } from "lucide-react";
import styles from "./EstadisticasCards.module.css";

const integerFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

const ratingFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

// `higherIsBetter` decide si subir es bueno (verde) o malo (rojo) al comparar con el período anterior.
const metrics = [
    {
        key: "total_programadas",
        label: "Citas programadas",
        description: "Agendadas para el período",
        Icon: CalendarClock,
        tone: "scheduled",
        higherIsBetter: true,
    },
    {
        key: "total_completadas",
        label: "Citas completadas",
        description: "Consultas finalizadas",
        Icon: CircleCheckBig,
        tone: "completed",
        higherIsBetter: true,
    },
    {
        key: "total_canceladas",
        label: "Citas canceladas",
        description: "Canceladas para el período",
        Icon: CalendarX,
        tone: "cancelled",
        higherIsBetter: false,
    },
    {
        key: "total_inasistencias",
        label: "Inasistencias",
        description: "Pacientes que no asistieron",
        Icon: UserRoundX,
        tone: "missed",
        higherIsBetter: false,
    },
    {
        key: "porcentaje_asistencia",
        label: "Asistencia",
        description: "Sobre citas con resultado",
        Icon: Activity,
        tone: "attendance",
        percentage: true,
        higherIsBetter: true,
    },
    {
        key: "promedio_calificacion",
        label: "Calificación",
        Icon: Star,
        tone: "rating",
        rating: true,
        higherIsBetter: true,
    },
];

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const safeNumber = (value) => Math.max(0, toNumber(value) ?? 0);

// Diferencia contra el período anterior: porcentaje para conteos y puntos para porcentajes y calificación.
function compare({ key, percentage, rating }, actual, anterior) {
    if (!anterior) return null;
    const current = toNumber(actual[key]);
    const previous = toNumber(anterior[key]);
    if (current === null || previous === null) return null;

    if (percentage || rating) {
        const diff = Math.round((current - previous) * 10) / 10;
        return { diff, text: `${diff > 0 ? "+" : ""}${percentageFormatter.format(diff)}${percentage ? " pts" : ""}` };
    }

    if (previous === 0) {
        return current === 0 ? { diff: 0, text: "Sin cambios" } : { diff: 1, text: "Nuevo", isNew: true };
    }

    const diff = Math.round(((current - previous) / previous) * 1000) / 10;
    return { diff, text: `${diff > 0 ? "+" : ""}${percentageFormatter.format(diff)}%` };
}

function Delta({ comparison, higherIsBetter }) {
    if (!comparison) return <span className={styles.deltaNone}>Sin período anterior</span>;
    const { diff, text } = comparison;
    const direction = diff === 0 ? "flat" : diff > 0 ? "up" : "down";
    const good = diff === 0 ? "neutral" : (diff > 0) === higherIsBetter ? "good" : "bad";
    const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

    return (
        <span className={`${styles.delta} ${styles[good]}`}>
            <Icon size={14} aria-hidden="true" />
            <span>{text}</span>
            <small>vs. período anterior</small>
        </span>
    );
}

export default function EstadisticasCards({ estadisticas = {}, anteriores = null }) {
    return (
        <section className={styles.grid} aria-label="Indicadores principales de citas">
            {metrics.map((metric) => {
                const { key, label, description, Icon, tone, percentage, rating, higherIsBetter } = metric;
                const total = safeNumber(estadisticas.total_calificaciones);
                const rawRating = toNumber(estadisticas[key]);
                const hasRating = rating && rawRating !== null && total > 0;
                const formatted = rating
                    ? hasRating ? ratingFormatter.format(rawRating) : "—"
                    : percentage
                        ? `${percentageFormatter.format(safeNumber(estadisticas[key]))}%`
                        : integerFormatter.format(safeNumber(estadisticas[key]));
                const detail = rating
                    ? hasRating
                        ? `${integerFormatter.format(total)} ${total === 1 ? "opinión" : "opiniones"} de pacientes`
                        : "Aún sin calificaciones"
                    : description;

                return (
                    <article className={`${styles.card} ${styles[tone]}`} key={key}>
                        <div className={styles.cardTop}>
                            <span className={styles.icon} aria-hidden="true">
                                <Icon size={15} strokeWidth={1.9} />
                            </span>
                            <span className={styles.label}>{label}</span>
                        </div>
                        <strong className={styles.value}>
                            {formatted}
                            {hasRating && <span className={styles.outOf}>/ 5</span>}
                        </strong>
                        {rating && <p>{detail}</p>}
                        <Delta comparison={rating && !hasRating ? null : compare(metric, estadisticas, anteriores)} higherIsBetter={higherIsBetter} />
                    </article>
                );
            })}
        </section>
    );
}
