"use client";

import { useNotificationsContext } from "../../../../components/contex/NotificationsContext";
import NotificationCenter from "../../../../components/ui/Notifications/NotificationCenter";

export default function Notifications() {
    const {
        notificaciones, noLeidas, loading, error,
        paginaActual, totalPaginas, totalRegistros, cambiarPagina,
        cargarNotificaciones, marcarLeida, marcarTodasLeidas,
        eliminarNotificacion, eliminarTodasNotificaciones,
    } = useNotificationsContext();

    return (
        <NotificationCenter
            notifications={notificaciones}
            unreadCount={noLeidas}
            totalRecords={totalRegistros}
            loading={loading}
            error={error}
            pagination={{ currentPage: paginaActual, totalPages: totalPaginas, onChange: cambiarPagina }}
            actions={{
                retry: cargarNotificaciones,
                markRead: marcarLeida,
                markAllRead: marcarTodasLeidas,
                deleteOne: eliminarNotificacion,
                deleteAll: eliminarTodasNotificaciones,
            }}
        />
    );
}
