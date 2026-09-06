import { CalendarDays, Clock3, Info, MapPin } from "lucide-react";
import { WEEK_DAYS } from "../mockDoctors";
import styles from "./AvailabilitySchedule.module.css";

export default function AvailabilitySchedule({ doctor }) {
    return (
        <div className={styles.schedule}>
            <div className={styles.doctorSummary}>
                <span><CalendarDays size={22} aria-hidden="true" /></span>
                <div>
                    <strong>{doctor.especialidad}</strong>
                    <p><MapPin size={14} aria-hidden="true" />{doctor.ciudad}, {doctor.departamento}</p>
                </div>
            </div>

            <div className={styles.week} aria-label={`Agenda semanal de ${doctor.nombre}`}>
                {WEEK_DAYS.map((day) => {
                    const availability = doctor.disponibilidades.find(
                        (item) => item.dia === day.nombre
                    );
                    const blocks = availability?.bloques ?? [];

                    return (
                        <div className={`${styles.dayRow} ${blocks.length ? "" : styles.unavailable}`} key={day.nombre}>
                            <div className={styles.dayName}>
                                <span>{day.corto}</span>
                                <strong>{day.nombre}</strong>
                            </div>
                            {blocks.length > 0 ? (
                                <div className={styles.blocks}>
                                    {blocks.map((block) => (
                                        <span key={`${block.horaInicio}-${block.horaFin}`}>
                                            <Clock3 size={14} aria-hidden="true" />
                                            {block.horaInicio}–{block.horaFin}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p>No disponible</p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className={styles.notice}>
                <Info size={17} aria-hidden="true" />
                <p>
                    Estos son bloques generales de atención. No representan horas concretas libres para reservar una cita.
                </p>
            </div>
        </div>
    );
}
