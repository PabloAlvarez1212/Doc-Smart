"use client";
import AppointmentCard from "../../../ui/AppointmentCard/AppointmentCard";
import styles from "./Appointment.module.css"

export default function AppointmentList({
    citas,
    rol,
    cancelarCita,
}) {

    if (!citas.length) {
        return (
            <div className={styles.empty}>
                <p>No se encontraron citas.</p>
            </div>
        );
    }

    return (
        <div className={styles.containerCard}>

            {citas.map((cita) => (
                <AppointmentCard
                    key={cita.id}
                    cita={cita}
                    rol={rol}
                    cancelarCita={cancelarCita}
                />
            ))}

        </div>
    );
}