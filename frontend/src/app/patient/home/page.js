"use client"

import { useState, useEffect } from "react"

import Hero from "../../../../components/patient/Home/Hero/Hero"
import StaticCards from "../../../../components/patient/Home/StaticCards/StaticCards"
import AppointmentsList from "../../../../components/patient/Home/AppointmentsList/AppointmentsList"
import Notifications from "../../../../components/patient/Home/Notifications/Notifications"

import { useDashboardPaciente } from "../../../../components/patient/Home/useDashboardPaciente"
import { useNotificationsContext } from "../../../../components/contex/NotificationsContext"

export default function Home() {

    const { dashboard, loading } = useDashboardPaciente()

    const {
        notificaciones,
        noLeidas,
        marcarLeida,
        eventoCita
    } = useNotificationsContext()

    const [citas, setCitas] = useState([])
    const [pendientes, setPendientes] = useState(0)
    const [realizadas, setRealizadas] = useState(0)

    // Carga inicial desde el dashboard
    useEffect(() => {

        if (!dashboard) return

        setCitas(
            dashboard?.proximas_citas || []
        )

        setPendientes(
            dashboard?.estadisticas?.consultas_pendientes || 0
        )

        setRealizadas(
            dashboard?.estadisticas?.consultas_realizadas_mes || 0
        )

    }, [dashboard])

    // Cambios en tiempo real recibidos por WebSocket
    useEffect(() => {

        if (!eventoCita) return

        const {
            tipo_evento,
            cita
        } = eventoCita

        if (!cita) return

        const estado = cita?.estado?.toUpperCase()

        // Próximas citas: solo mantener confirmadas
        setCitas(prevCitas => {

            if (estado !== "CONFIRMADA") {
                return prevCitas.filter(
                    citaActual =>
                        citaActual.id !== cita.id
                )
            }

            const existe = prevCitas.some(
                citaActual =>
                    citaActual.id === cita.id
            )

            if (existe) {
                return prevCitas.map(
                    citaActual =>
                        citaActual.id === cita.id
                            ? cita
                            : citaActual
                )
            }

            return [
                cita,
                ...prevCitas
            ]
        })

        // Pendiente
        if (
            tipo_evento === "NUEVA_SOLICITUD" ||
            estado === "PENDIENTE"
        ) {
            setPendientes(
                prev => prev + 1
            )
        }

        // Confirmada
        if (
            tipo_evento === "CITA_CONFIRMADA" ||
            estado === "CONFIRMADA"
        ) {
            setPendientes(
                prev => Math.max(0, prev - 1)
            )
        }

        // Completada
        if (
            tipo_evento === "CITA_COMPLETADA" ||
            estado === "COMPLETADA" ||
            estado === "REALIZADA"
        ) {
            setRealizadas(
                prev => prev + 1
            )
        }

        // Cancelada o rechazada
        if (
            tipo_evento === "CITA_CANCELADA" ||
            estado === "CANCELADA" ||
            estado === "RECHAZADA"
        ) {
            setPendientes(
                prev => Math.max(0, prev - 1)
            )
        }

    }, [eventoCita])

    if (loading) {
        return <p>Cargando...</p>
    }

    return (
        <>
            <Hero
                nombre={dashboard?.usuario}
                proximasCitas={citas.length}
                noLeidas={noLeidas}
                foto_perfil={dashboard?.foto_perfil}
            />

            <StaticCards
                dashboard={dashboard}
                noLeidas={noLeidas}
                cantidadProximasCitas={citas.length}
                consultasPendientes={pendientes}
                consultasRealizadas={realizadas}
            />

            <AppointmentsList
                data={{
                    ...dashboard,
                    proximas_citas: citas
                }}
            />

            <Notifications
                data={{
                    ...dashboard,
                    notificaciones
                }}
                onMarcarLeida={marcarLeida}
            />
        </>
    )
}