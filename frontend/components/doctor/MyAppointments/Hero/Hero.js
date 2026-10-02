import {
    CalendarClock,
    UserRound
} from "lucide-react";

import styles from "./Hero.module.css";


export default function Hero({
    resumen,
    loading = false
}) {

    const proximaCita =
        resumen?.proxima_cita;


    const formatearFecha = (fecha) => {

        if (!fecha) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "es-CO",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        ).format(
            new Date(fecha)
        );
    };


    const formatearHora = (fecha) => {

        if (!fecha) {
            return "";
        }

        return new Intl.DateTimeFormat(
            "es-CO",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }
        ).format(
            new Date(fecha)
        );
    };


    return (
        <header className={styles.hero}>

            <div className={styles.heading}>

                <div>

                    <p className={styles.eyebrow}>
                        Agenda médica
                    </p>

                    <h1>
                        Mis citas
                    </h1>

                    <p className={styles.description}>
                        Gestiona tus consultas,
                        confirma solicitudes y mantén
                        tu agenda organizada.
                    </p>

                </div>

            </div>


            <div className={styles.summary}>

                <CalendarClock
                    size={21}
                    aria-hidden="true"
                />

                {loading ? (

                    <div>
                        <strong>
                            Cargando...
                        </strong>

                        <span>
                            Próxima consulta
                        </span>
                    </div>

                ) : proximaCita ? (

                    <div className={styles.nextAppointment}>

                        <div className={styles.summaryTitle}>
                            <strong>
                                {formatearHora(
                                    proximaCita.fecha_programada
                                )}
                            </strong>

                            <span>
                                Próxima consulta
                            </span>
                        </div>


                        <div className={styles.patient}>

                            <UserRound
                                size={14}
                                aria-hidden="true"
                            />

                            <span>
                                {proximaCita.paciente}
                            </span>

                        </div>


                        <span className={styles.date}>
                            {formatearFecha(
                                proximaCita.fecha_programada
                            )}
                        </span>

                    </div>

                ) : (

                    <div>

                        <strong>
                            Sin citas próximas
                        </strong>

                        <span>
                            Agenda disponible
                        </span>

                    </div>

                )}

            </div>

        </header>
    );
}