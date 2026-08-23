"use client";
import Hero from "../../../../components/patient/Notifications/Hero/Hero";
import NotificationsList from "../../../../components/patient/Notifications/NotificationsList/NotificationsList";
import { useNotificationsContext } from "../../../../components/contex/NotificationsContext";
import Styles from "./Notifications.module.css"

export default function Notifications() {
    const {
        marcarLeida,
        marcarTodasLeidas,
        noLeidas,
        eliminarNotificacion,
        eliminarTodasNotificaciones,
        notificaciones,
        loading: loadingNotificaciones
    } = useNotificationsContext();

    if (loadingNotificaciones) {
        return <p className={Styles.textCargandoNotificaciones}>Cargando notificaciones...</p>;
    }

    return (
        <div>
            <Hero
                noLeidas={noLeidas}
                marcarTodasLeidas={marcarTodasLeidas}
                notificaciones={notificaciones}
                eliminarTodas={eliminarTodasNotificaciones}
            />
            {notificaciones?.length > 0 ? (
                <NotificationsList
                    data={{ notificaciones }}
                    marcarLeida={marcarLeida}
                    eliminarNotificacion={eliminarNotificacion}
                />
            ): (<p className={Styles.textNingunaNotificacion}>No tienes notificaciones</p>)}
        </div>
    )
}