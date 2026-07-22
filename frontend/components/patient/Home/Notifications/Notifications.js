import styles from "./Notifications.module.css";
import Button from "../../../ui/Button/Button";
import { CheckCircle, AlertCircle } from "lucide-react";
export default function Notifications() {
    return (
        <div className={styles.containerMain}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Notificaciones</h2>
                    <Button className={styles.btn} size="sm">Ver más &nbsp;&nbsp;&gt;</Button>
                </div>
                <div className={styles.listNotifications}>
                    <div className={styles.item}>
                        <CheckCircle color="green" />
                        <div className={styles.description}>
                            <p className={styles.text}>Tu cita de mañana ha sido confirmada</p>
                            <p className={styles.time}>Hace 2h</p>
                        </div>
                    </div>
                    <div className={styles.item}>
                        <AlertCircle color="#FFAD51" />
                        <div className={styles.description}>
                            <p className={styles.text}>Tu cita de mañana ha sido confirmada</p>
                            <p className={styles.time}>Hace 2h</p>
                        </div>
                    </div>
                    <div className={styles.item}>
                        <AlertCircle color="#FFAD51" />
                        <div className={styles.description}>
                            <p className={styles.text}>Tu cita de mañana ha sido confirmada</p>
                            <p className={styles.time}>Hace 2h</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}