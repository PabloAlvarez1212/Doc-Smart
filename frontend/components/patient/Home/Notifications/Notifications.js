import styles from "./Notifications.module.css";
import Button from "../../../ui/Button/Button";
import { renderIcono } from "@/app/utils/estadoDise/estadoDiseUtils";
import { formatearFechaRelativa } from "@/app/utils/fechaFormaterUtils";

export default function Notifications({ data, onMarcarLeida, onMarcarTodasLeidas }) {
    // Sincronizamos con las notificaciones que vienen de la prop `data`
    const listNotificaciones = (data?.notificaciones || []).slice(0, 3);

    return (
        <div className={styles.containerMain}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Notificaciones mas recientes</h2>
                    <Button className={styles.btn} size="sm">Ver más &nbsp;&nbsp;&gt;</Button>
                </div>

                {listNotificaciones.length > 0 ? (
                    <div className={styles.listNotifications}>
                        {listNotificaciones.map((notificacion) => {
                            const tiempoRelativo = formatearFechaRelativa(notificacion?.fecha);
                            const esLeida = notificacion?.leida;

                            return (
                                <div 
                                    className={`${styles.item} ${!esLeida ? styles.noLeida : ''}`} 
                                    key={notificacion?.id}
                                    onClick={() => {
                                        if (!esLeida && onMarcarLeida) {
                                            onMarcarLeida(notificacion.id);
                                        }
                                    }}
                                >
                                    {renderIcono(notificacion.tipo)}
                                    <div className={styles.description}>
                                        <p className={styles.text}>{notificacion.mensaje}</p>
                                        <p className={styles.time}>{tiempoRelativo}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className={styles.textNotCitas}>No hay notificaciones que mostrar</p>
                )}
            </div>
        </div>
    );
}