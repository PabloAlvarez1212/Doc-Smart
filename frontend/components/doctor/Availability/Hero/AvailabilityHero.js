import {
    Banknote,
    CalendarClock,
    Clock3
} from "lucide-react";

import styles from "./AvailabilityHero.module.css";


export default function AvailabilityHero({
    duracionConsulta,
    valorConsulta = null
}) {

    return (
        <section className={styles.hero}>

            <div className={styles.heading}>

                <div className={styles.icon}>
                    <CalendarClock size={28} />
                </div>

                <div>

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

            <div className={styles.chips}>
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

                <div className={styles.summary}>
                    <Banknote size={20} />

                    <div>
                        <strong>
                            {valorConsulta != null
                                ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valorConsulta)
                                : "Sin definir"}
                        </strong>

                        <span>
                            Valor por consulta
                        </span>
                    </div>
                </div>
            </div>

        </section>
    );
}