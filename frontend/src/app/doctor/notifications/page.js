"use client";

import Hero from "../../../../components/patient/Notifications/Hero/Hero";
import NotificationsList from "../../../../components/patient/Notifications/NotificationsList/NotificationsList";
import useProfile from "../../../../components/doctor/Profile/useProfile";
import { useNotificaciones } from "../../../../components/hooks/useNotificaciones";

export default function Notifications() {

    const {
        perfil,
        loading
    } = useProfile();

    const {
    marcarLeida,
    marcarTodasLeidas,
    eliminarNotificacion,
    eliminarTodasNotificaciones,
    noLeidas,
    notificaciones,
    loading: loadingNotificaciones
} = useNotificaciones(perfil?.id);

    if (loading || loadingNotificaciones) {
        return <p>Cargando notificaciones...</p>;
    }

    return (
        <div>

            <Hero
                noLeidas={noLeidas}
                marcarTodasLeidas={marcarTodasLeidas}
                notificaciones={notificaciones}
                eliminarTodas={eliminarTodasNotificaciones}
            />

            <NotificationsList
                data={{
                    ...perfil,
                    notificaciones
                }}
                marcarLeida={marcarLeida}
                eliminarNotificacion={eliminarNotificacion}
                eliminarTodasNotificaciones={eliminarTodasNotificaciones}
            />

        </div>
    );
}