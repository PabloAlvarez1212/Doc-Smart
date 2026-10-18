import { Activity, CalendarClock, CircleCheckBig, UserRoundX,CalendarX } from "lucide-react";
import styles from "./EstadisticasCards.module.css";

const integerFormatter = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

const metrics = [
    {
        key: "total_programadas",
        label: "Citas programadas",
        description: "Agendadas para el período",
        Icon: CalendarClock,
        tone: "scheduled",
    },
    {
        key: "total_completadas",
        label: "Citas completadas",
        description: "Consultas finalizadas",
        Icon: CircleCheckBig,
        tone: "completed",
    },
    {
        key: "total_canceladas",
        label: "Citas canceladas",
        description: "Canceladas para el período",
        Icon: CalendarX,
        tone: "cancelled",
    },
    {
        key: "total_inasistencias",
        label: "Inasistencias",
        description: "Pacientes que no asistieron",
        Icon: UserRoundX,
        tone: "missed",
    },
    {
        key: "porcentaje_asistencia",
        label: "Asistencia",
        description: "Sobre citas con resultado",
        Icon: Activity,
        tone: "attendance",
        percentage: true,
    },
];

const safeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export default function EstadisticasCards({ estadisticas = {} }) {
    return (
        <section className={styles.grid} aria-label="Indicadores principales de citas">
            {metrics.map(({ key, label, description, Icon, tone, percentage }) => {
                const value = safeNumber(estadisticas[key]);
                const formatted = percentage
                    ? `${percentageFormatter.format(value)}%`
                    : integerFormatter.format(value);

                return (
                    <article className={`${styles.card} ${styles[tone]}`} key={key}>
                        <div className={styles.cardTop}>
                            <span className={styles.icon} aria-hidden="true">
                                <Icon size={20} strokeWidth={1.9} />
                            </span>
                            <span className={styles.label}>{label}</span>
                        </div>
                        <strong className={styles.value}>{formatted}</strong>
                        <p>{description}</p>
                    </article>
                );
            })}
        </section>
    );
}
