import styles from "./Notifications.module.css";
import Button from "../../../ui/Button/Button";
import { renderIcono } from "@/app/utils/estadoDise/estadoDiseUtils";
import { formatearFechaRelativa } from "@/app/utils/fechaFormaterUtils";

export default function Notifications({ data }) {

    const notificaciones = (data?.notificaciones || []).slice(0, 3);

    return (
        <div className={styles.containerMain}>
            <div className={styles.container}>

                <div className={styles.header}>
                    <h2>Notificaciones recientes</h2>

                    <Button className={styles.btnGreen} size="sm">
                        Ver más &nbsp;&nbsp;&gt;
                    </Button>
                </div>

                {
                    notificaciones.length > 0 ? (

                        <div className={styles.listNotifications}>

                            {
                                notificaciones.map((notificacion) => {

                                    const tiempo = formatearFechaRelativa(
                                        notificacion.fecha
                                    );

                                    return (

                                        <div
                                            key={notificacion.id}
                                            className={`${styles.item} ${
                                                !notificacion.leida
                                                    ? styles.noLeida
                                                    : ""
                                            }`}
                                        >

                                            {renderIcono(notificacion.tipo)}

                                            <div className={styles.description}>
                                                <p className={styles.text}>
                                                    {notificacion.mensaje}
                                                </p>

                                                <p className={styles.time}>
                                                    {tiempo}
                                                </p>
                                            </div>

                                        </div>

                                    );
                                })
                            }

                        </div>

                    ) : (

                        <p className={styles.textNotCitas}>
                            No hay notificaciones para mostrar.
                        </p>

                    )
                }

            </div>
        </div>
    );
}