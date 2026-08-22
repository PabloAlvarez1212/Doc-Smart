"use client";
import Hero from "../../../../components/patient/Notifications/Hero/Hero";
import NotificationsList from "../../../../components/patient/Notifications/NotificationsList/NotificationsList";
import useProfile from "../../../../components/patient/Profile/useProfile";
import { useNotificaciones } from "../../../../components/hooks/useNotificaciones";
import Styles from "./Notifications.module.css"

export default function Notifications() {
    const { perfil, loading } = useProfile();

    const {
        marcarLeida,
        marcarTodasLeidas,
        noLeidas,
        eliminarNotificacion,
        eliminarTodasNotificaciones,
        notificaciones,
        loading: loadingNotificaciones
    } = useNotificaciones(perfil?.id, "paciente");

    if (loading || loadingNotificaciones) {
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
                    data={{ ...perfil, notificaciones }}
                    marcarLeida={marcarLeida}
                    eliminarNotificacion={eliminarNotificacion}
                />
            ): (<p className={Styles.textNingunaNotificacion}>No tienes notificaciones</p>)}
        </div>
    )
}