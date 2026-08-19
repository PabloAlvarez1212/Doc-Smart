"use client";
import Hero from "../../../../components/patient/Notifications/Hero/Hero";
import NotificationsList from "../../../../components/patient/Notifications/NotificationsList/NotificationsList";
import useProfile from "../../../../components/patient/Profile/useProfile";
import { useNotificaciones } from "../../../../components/hooks/useNotificaciones";

export default function Notifications() {
    const { perfil, loading } = useProfile();

    const {
        marcarLeida,
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
            />
            <NotificationsList
                data={{...perfil,notificaciones}}
                marcarLeida={marcarLeida}
            />
        </div>
    )
}