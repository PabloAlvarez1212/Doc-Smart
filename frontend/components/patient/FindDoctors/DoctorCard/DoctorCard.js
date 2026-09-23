import Image from "next/image";
import {
    Building2,
    CalendarClock,
    CalendarPlus,
    MapPin,
    Stethoscope
} from "lucide-react";

import Button from "../../../ui/Button/Button";
import styles from "./DoctorCard.module.css";

function formatearFecha(fecha) {
    if (!fecha) return "";

    return new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date(`${fecha}T00:00:00`));
}

export default function DoctorCard({ doctor, onSchedule }) {

    const fullName =
        [doctor.nombre, doctor.apellido]
            .filter(Boolean)
            .join(" ") || "Médico";

    const location =
        [doctor.ciudad, doctor.departamento]
            .filter(Boolean)
            .join(", ");

    const proximaDisponibilidad =
        doctor.proxima_disponibilidad;

    const tieneDisponibilidad =
        Boolean(proximaDisponibilidad);

    return (
        <article className={styles.card}>

            <div className={styles.identity}>
                <div className={styles.photoFrame}>
                    <Image
                        src={
                            doctor.foto_perfil ||
                            "/images/foto_default.png"
                        }
                        alt={`Foto de perfil de ${fullName}`}
                        width={116}
                        height={116}
                        className={styles.photo}
                    />
                </div>

                <div className={styles.profile}>
                    <span className={styles.specialty}>
                        <Stethoscope size={14} />
                        {doctor.especialidad ||
                            "Especialidad no especificada"}
                    </span>

                    <h2>{fullName}</h2>

                    {location && (
                        <p className={styles.location}>
                            <MapPin size={16} />
                            {location}
                        </p>
                    )}

                    {doctor.direccion && (
                        <p className={styles.address}>
                            <Building2 size={16} />
                            {doctor.direccion}
                        </p>
                    )}
                </div>
            </div>

            <div className={styles.schedule}>
                <span
                    className={styles.scheduleIcon}
                    aria-hidden="true"
                >
                    <CalendarClock size={20} />
                </span>

                <div>
                    {tieneDisponibilidad ? (
                        <>
                            <strong>
                                Próxima disponibilidad
                            </strong>

                            <p>
                                {formatearFecha(
                                    proximaDisponibilidad.fecha
                                )}
                                {" · "}
                                {
                                    proximaDisponibilidad.hora_inicio
                                }
                                {" - "}
                                {
                                    proximaDisponibilidad.hora_fin
                                }
                            </p>
                        </>
                    ) : (
                        <>
                            <strong>
                                Sin disponibilidad próxima
                            </strong>

                            <p>
                                Este profesional no tiene horarios
                                disponibles por el momento.
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.actions}>
                <Button
                    className={styles.primaryAction}
                    disabled={!tieneDisponibilidad}
                    onClick={() => onSchedule?.(doctor)}
                >
                    <CalendarPlus size={18} />
                    Agendar cita
                </Button>

                <small className={styles.actionHint}>
                    {tieneDisponibilidad
                        ? "Ver horarios disponibles"
                        : "Sin horarios disponibles"}
                </small>
            </div>

        </article>
    );
}