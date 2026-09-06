import Image from "next/image";
import { Building2, CalendarDays, CalendarPlus, MapPin, Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import AvailabilityPreview from "../Availability/AvailabilityPreview";
import styles from "./DoctorCard.module.css";

export default function DoctorCard({ doctor, onViewAvailability, onScheduleAppointment }) {
    const hasAvailability = doctor.disponibilidades.length > 0;

    return (
        <article className={styles.card}>
            <div className={styles.identity}>
                <div className={styles.photoFrame}>
                    <Image
                        src={doctor.fotoPerfil}
                        alt={`Foto de perfil de ${doctor.nombre}`}
                        width={116}
                        height={116}
                        className={styles.photo}
                    />
                    <span className={doctor.disponibleHoy ? styles.online : styles.offline} aria-hidden="true" />
                </div>
                <div className={styles.profile}>
                    <span className={styles.specialty}><Stethoscope size={14} />{doctor.especialidad}</span>
                    <h2>{doctor.nombre}</h2>
                    <p className={styles.location}><MapPin size={16} />{doctor.ciudad}, {doctor.departamento}</p>
                    <p className={styles.address}><Building2 size={16} />{doctor.direccion}</p>
                </div>
            </div>

            <div className={styles.schedule}>
                <AvailabilityPreview doctor={doctor} />
                <p className={styles.mockNotice}>Bloques generales de atención; no son citas disponibles.</p>
            </div>

            <div className={styles.actions}>
                <Button
                    variant="secundary"
                    className={styles.secondaryAction}
                    onClick={() => onViewAvailability(doctor.id)}
                    disabled={!hasAvailability}
                >
                    <CalendarDays size={17} /> Ver disponibilidad
                </Button>
                <Button
                    className={styles.primaryAction}
                    onClick={() => onScheduleAppointment(doctor.id)}
                    disabled={!hasAvailability}
                >
                    <CalendarPlus size={18} /> Agendar cita
                </Button>
            </div>
        </article>
    );
}
