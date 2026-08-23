"use client";
import { useState } from "react";
import Hero from "../../../../components/patient/Notifications/Hero/Hero";
import NotificationsList from "../../../../components/patient/Notifications/NotificationsList/NotificationsList";
import { useNotificationsContext } from "../../../../components/contex/NotificationsContext";
import Styles from "./Notifications.module.css"
import { filtrarNotificacionesPorFecha } from "@/app/utils/notificacionesUtils";

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

    const [filtroFecha, setFiltroFecha] = useState("todas")

    const notificacionesFiltradas =
        filtrarNotificacionesPorFecha(notificaciones, filtroFecha)

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
                setFiltroFecha={setFiltroFecha}
                filtroFecha={filtroFecha}
            />
            {notificacionesFiltradas?.length > 0 ? (
                <NotificationsList
                    data={{ notificaciones: notificacionesFiltradas }}
                    marcarLeida={marcarLeida}
                    eliminarNotificacion={eliminarNotificacion}
                />
            ) : (<p className={Styles.textNingunaNotificacion}>No tienes notificaciones</p>)}
        </div>
    )
}