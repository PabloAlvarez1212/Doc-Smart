import { CalendarClock, CheckCircle2 } from "lucide-react";
import { WEEK_DAYS } from "../mockDoctors";
import styles from "./AvailabilityPreview.module.css";

const formatBlock = ({ horaInicio, horaFin }) =>
    `${horaInicio}–${horaFin}`;

export default function AvailabilityPreview({ doctor }) {

    const disponibilidades =
        doctor?.disponibilidades ?? [];

    const orderedAvailability = WEEK_DAYS
        .map((day) => ({
            ...day,
            availability: disponibilidades.find(
                (item) => item.dia === day.nombre
            ),
        }))
        .filter(
            (item) =>
                item.availability?.bloques?.length > 0
        );

    const displayedDays =
        orderedAvailability.slice(0, 2);

    const remainingDays =
        orderedAvailability.length -
        displayedDays.length;

    const nextLabel =
        doctor?.proximaDisponibilidad?.dia ??
        "Agenda por confirmar";

    return (
        <div className={styles.availability}>

            <div className={styles.statusRow}>
                <span
                    className={`${styles.status} ${
                        doctor?.disponibleHoy
                            ? styles.today
                            : styles.upcoming
                    }`}
                >
                    {doctor?.disponibleHoy ? (
                        <CheckCircle2 size={15} />
                    ) : (
                        <CalendarClock size={15} />
                    )}

                    {doctor?.disponibleHoy
                        ? "Disponible hoy"
                        : "Próxima disponibilidad"}
                </span>

                <strong>
                    {doctor?.disponibleHoy
                        ? "Hoy"
                        : nextLabel}
                </strong>
            </div>

            {displayedDays.length > 0 ? (
                <div
                    className={styles.days}
                    aria-label={`Resumen semanal de ${doctor?.nombre ?? "médico"}`}
                >
                    {displayedDays.map(
                        ({ corto, availability }) => (
                            <div
                                className={styles.day}
                                key={availability.dia}
                            >
                                <span>
                                    {corto}
                                </span>

                                <p>
                                    {availability.bloques
                                        .map(formatBlock)
                                        .join(" · ")}
                                </p>
                            </div>
                        )
                    )}

                    {remainingDays > 0 && (
                        <small>
                            + {remainingDays}{" "}
                            {remainingDays === 1
                                ? "día"
                                : "días"}{" "}
                            disponible
                            {remainingDays === 1
                                ? ""
                                : "s"}
                        </small>
                    )}
                </div>
            ) : (
                <p className={styles.noSlots}>
                    No hay bloques semanales publicados por el momento.
                </p>
            )}

        </div>
    );
}