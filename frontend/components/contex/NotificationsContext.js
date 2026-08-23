"use client"

import { createContext, useContext } from "react"
import { useNotificaciones } from "../hooks/useNotificaciones"

const NotificationsContext = createContext(null)

export function NotificationsProvider({
    children,
    userId,
    tipoUsuario
}) {
    const notificacionesData = useNotificaciones(
        userId,
        tipoUsuario
    )

    return (
        <NotificationsContext.Provider
            value={notificacionesData}
        >
            {children}
        </NotificationsContext.Provider>
    )
}

export function useNotificationsContext() {
    const context = useContext(NotificationsContext)

    if (!context) {
        throw new Error(
            "useNotificationsContext debe usarse dentro de NotificationsProvider"
        )
    }

    return context
}