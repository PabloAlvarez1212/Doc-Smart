import styles from "./AppointmentsList.module.css";
import Button from "../../../ui/Button/Button";
import { Clock12Icon } from "lucide-react";
import formatearFecha from "@/app/utils/fechaFormaterUtils";

export default function AppointmentsList({ data }) {

    const citasHoy = (data?.citas_hoy || []).slice(0, 3);

    return (
        <div className={styles.containerMain}>
            <div className={styles.container}>

                <div className={styles.header}>
                    <h2>Citas de Hoy</h2>

                    <Button className={styles.btnGreen} size="sm">
                        Ver más &nbsp;&nbsp;&gt;
                    </Button>
                </div>

                {
                    citasHoy.length > 0 ? (

                        <div className={styles.containerCards}>

                            {
                                citasHoy.map((cita) => {

                                    const { fecha, hora } = formatearFecha(
                                        cita.fecha_programada
                                    );

                                    return (

                                        <div
                                            className={styles.card}
                                            key={cita.id}
                                        >

                                            <div className={styles.containerInfo}>

                                                <div className={styles.avatar}>
                                                    {cita.paciente
                                                        ?.split(" ")
                                                        .map(nombre => nombre[0])
                                                        .slice(0, 2)
                                                        .join("")}
                                                </div>

                                                <div className={styles.description}>
                                                    <h3>{cita.paciente}</h3>

                                                    <p>
                                                        Estado: {cita.estado}
                                                    </p>

                                                    <div className={styles.schedule}>
                                                        <Clock12Icon size={18} />
                                                        <span>{fecha}</span>
                                                        <span>{hora}</span>
                                                    </div>

                                                </div>

                                            </div>

                                        </div>

                                    );

                                })
                            }

                        </div>

                    ) : (

                        <p className={styles.textNotCitas}>
                            No hay citas programadas para hoy.
                        </p>

                    )
                }

            </div>
        </div>
    );
}