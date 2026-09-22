import {
    CalendarClock,
    Clock3
} from "lucide-react";

import styles from "./AvailabilityHero.module.css";


export default function AvailabilityHero({
    duracionConsulta
}) {

    return (
        <section className={styles.hero}>

            <div className={styles.heading}>

                <div className={styles.icon}>
                    <CalendarClock size={28} />
                </div>

                <div>

                    <p className={styles.eyebrow}>
                        Disponibilidad
                    </p>

                    <h1>
                        Mi disponibilidad
                    </h1>

                    <p className={styles.description}>
                        Configura los días y horarios
                        en los que tus pacientes pueden
                        agendar citas contigo.
                    </p>

                </div>

            </div>

            <div className={styles.summary}>
                <Clock3 size={20} />

                <div>
                    <strong>
                        {duracionConsulta} minutos
                    </strong>

                    <span>
                        Duración por consulta
                    </span>
                </div>
            </div>

        </section>
    );
}