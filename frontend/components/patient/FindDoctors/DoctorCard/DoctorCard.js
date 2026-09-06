import Image from "next/image";
import { Building2, CalendarClock, CalendarPlus, MapPin, Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import styles from "./DoctorCard.module.css";

export default function DoctorCard({ doctor }) {
    const fullName = [doctor.nombre, doctor.apellido].filter(Boolean).join(" ") || "Médico";
    const location = [doctor.ciudad, doctor.departamento].filter(Boolean).join(", ");

    return (
        <article className={styles.card}>
            <div className={styles.identity}>
                <div className={styles.photoFrame}>
                    <Image
                        src={doctor.foto_perfil || "/images/foto_default.png"}
                        alt={`Foto de perfil de ${fullName}`}
                        width={116}
                        height={116}
                        className={styles.photo}
                    />
                </div>
                <div className={styles.profile}>
                    <span className={styles.specialty}><Stethoscope size={14} />{doctor.especialidad || "Especialidad no especificada"}</span>
                    <h2>{fullName}</h2>
                    {location && <p className={styles.location}><MapPin size={16} />{location}</p>}
                    {doctor.direccion && <p className={styles.address}><Building2 size={16} />{doctor.direccion}</p>}
                </div>
            </div>

            <div className={styles.schedule}>
                <span className={styles.scheduleIcon} aria-hidden="true"><CalendarClock size={20} /></span>
                <div>
                    <strong>Disponibilidad próximamente</strong>
                    <p>La agenda en línea de este profesional estará disponible en una siguiente etapa.</p>
                </div>
            </div>

            <div className={styles.actions}>
                <Button
                    className={styles.primaryAction}
                    disabled
                    aria-describedby={`appointment-status-${doctor.id}`}
                >
                    <CalendarPlus size={18} /> Agendar cita
                </Button>
                <small id={`appointment-status-${doctor.id}`} className={styles.actionHint}>Próximamente</small>
            </div>
        </article>
    );
}
