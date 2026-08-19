"use client"

import { useState, useEffect, useRef } from "react"
import {
    obtenerNotificacionesService,
    marcarNotificacionLeidaService
} from "@/app/services/notificationsServices"

export const useNotificaciones = (userId, options = {}) => {

    const { onEventoCita } = options

    const [notificaciones, setNotificaciones] = useState([])
    const [noLeidas, setNoLeidas] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const ws = useRef(null)

    const onEventoCitaRef = useRef(onEventoCita)

    useEffect(() => {
        onEventoCitaRef.current = onEventoCita
    }, [onEventoCita])

    const cargarNotificaciones = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await obtenerNotificacionesService()

            const data = response?.data ?? []

            setNotificaciones(
                Array.isArray(data)
                    ? data
                    : []
            )

            const cantidadNoLeidas = data.filter(
                notificacion => !notificacion.leida
            ).length

            setNoLeidas(cantidadNoLeidas)

        } catch (error) {

            console.error(error)

            setError(
                "No se pudieron cargar las notificaciones."
            )

        } finally {

            setLoading(false)
        }
    }

    useEffect(() => {
        cargarNotificaciones()
    }, [])

    useEffect(() => {

        if (!userId) return

        ws.current = new WebSocket(
            `ws://localhost:8000/ws/notificaciones/${userId}/`
        )

        ws.current.onopen = () => {
            console.log("WebSocket conectado")
        }

        ws.current.onmessage = (event) => {

            const data = JSON.parse(event.data)

            console.log("📩 Evento recibido:", data)

            if (data.type === "count_initial") {
                setNoLeidas(data.count)
            }

            if (data.type === "notification_update") {

                setNoLeidas(data.count)

                if (data.notificacion) {

                    setNotificaciones(prev => {

                        const existe = prev.some(
                            notificacion =>
                                notificacion.id === data.notificacion.id
                        )

                        if (existe) {
                            return prev
                        }

                        return [
                            data.notificacion,
                            ...prev
                        ]
                    })

                    const citaData =
                        data.cita ||
                        data.notificacion?.extra_data?.cita

                    const tipoEvento =
                        data.tipo_evento ||
                        data.notificacion?.extra_data?.tipo_evento

                    if (
                        citaData &&
                        onEventoCitaRef.current
                    ) {
                        onEventoCitaRef.current({
                            tipo_evento: tipoEvento,
                            cita: citaData,
                            notificacion: data.notificacion
                        })
                    }
                }
            }
        }

        ws.current.onclose = () => {
            console.log("WebSocket desconectado")
        }

        ws.current.onerror = (error) => {
            console.log("WebSocket error:", error)
        }

        return () => {
            if (ws.current) {
                ws.current.close()
            }
        }

    }, [userId])

    const marcarLeida = async (idNotificacion) => {

        const notificacion = notificaciones.find(
            n => n.id === idNotificacion
        )

        if (!notificacion || notificacion.leida) {
            return
        }

        try {

            await marcarNotificacionLeidaService(
                idNotificacion
            )

            setNotificaciones(prev =>
                prev.map(notificacion =>
                    notificacion.id === idNotificacion
                        ? {
                            ...notificacion,
                            leida: true
                        }
                        : notificacion
                )
            )

            setNoLeidas(prev =>
                Math.max(0, prev - 1)
            )

        } catch (error) {

            console.error(
                "Error al marcar la notificación como leída",
                error
            )
        }
    }

    const marcarTodasLeidas = async () => {

        const pendientes = notificaciones.filter(
            notificacion => !notificacion.leida
        )

        for (const notificacion of pendientes) {
            await marcarLeida(
                notificacion.id
            )
        }
    }

    return {
        notificaciones,
        noLeidas,
        marcarLeida,
        marcarTodasLeidas,
        cargarNotificaciones,
        loading,
        error
    }
}