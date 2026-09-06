import { SearchX, Stethoscope } from "lucide-react";
import Button from "../../../ui/Button/Button";
import DoctorCard from "../DoctorCard/DoctorCard";
import styles from "./DoctorsList.module.css";

export default function DoctorsList({
    doctors,
    hasFilters,
    onViewAvailability,
    onScheduleAppointment,
    onReset,
}) {
    return (
        <section className={styles.section} aria-labelledby="doctors-list-title">
            <div className={styles.heading}>
                <div>
                    <p>Profesionales disponibles</p>
                    <h2 id="doctors-list-title">Elige quién cuidará de tu salud</h2>
                </div>
                <span><Stethoscope size={16} />{doctors.length} en el directorio</span>
            </div>

            {doctors.length > 0 ? (
                <div className={styles.list}>
                    {doctors.map((doctor) => (
                        <DoctorCard
                            key={doctor.id}
                            doctor={doctor}
                            onViewAvailability={onViewAvailability}
                            onScheduleAppointment={onScheduleAppointment}
                        />
                    ))}
                </div>
            ) : (
                <div className={styles.empty} role="status">
                    <span><SearchX size={31} aria-hidden="true" /></span>
                    <h3>No encontramos médicos con esos criterios</h3>
                    <p>Prueba otra ubicación, especialidad o disponibilidad para ampliar los resultados.</p>
                    {hasFilters && <Button onClick={onReset}>Ver todos los médicos</Button>}
                </div>
            )}
        </section>
    );
}
