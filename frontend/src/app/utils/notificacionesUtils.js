export const filtrarNotificacionesPorFecha = (
    notificaciones,
    filtroFecha
) => {
    if (!Array.isArray(notificaciones)) {
        return []
    }

    if (filtroFecha === "todas") {
        return notificaciones
    }

    const ahora = new Date()

    return notificaciones.filter((notificacion) => {
        const fechaNotificacion = new Date(notificacion.fecha)

        if (filtroFecha === "hoy") {
            return (
                fechaNotificacion.getDate() === ahora.getDate() &&
                fechaNotificacion.getMonth() === ahora.getMonth() &&
                fechaNotificacion.getFullYear() === ahora.getFullYear()
            )
        }

        if (filtroFecha === "7dias") {
            const hace7Dias = new Date(ahora)
            hace7Dias.setDate(ahora.getDate() - 7)
            hace7Dias.setHours(0, 0, 0, 0)

            return fechaNotificacion >= hace7Dias
        }

        if (filtroFecha === "30dias") {
            const hace30Dias = new Date(ahora)
            hace30Dias.setDate(ahora.getDate() - 30)
            hace30Dias.setHours(0, 0, 0, 0)

            return fechaNotificacion >= hace30Dias
        }

        return true
    })
}