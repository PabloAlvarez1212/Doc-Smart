"use client"
import Swal from "sweetalert2"
import { useState, useEffect, useRef } from "react"
import {
    obtenerNotificacionesService,
    marcarNotificacionLeidaService,
    marcarTodasNotificacionesLeidasService,
    eliminarNotificacionService,
} from "@/app/services/notificationsServices"
import { obtenerPrimerError } from "@/app/utils/errrorUtils"

export const useNotificaciones = (userId, tipoUsuario, options = {}) => {

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
            `ws://localhost:8000/ws/notificaciones/${tipoUsuario}/${userId}/`
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

    }, [userId,tipoUsuario])

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
            console.error("Error al marcar la notificación como leída",error)
            const mensajeBackend = obtenerPrimerError(error.response?.data?.errores)
            await Swal.fire({
                icon: "error",
                title: "No se pudo eliminar",
                text:
                    mensajeBackend ||
                    "Ocurrió un error al eliminar la notificación."
            })
        }
    }

    const marcarTodasLeidas = async () => {
        if (noLeidas === 0) return
        try {
            const respuesta = await Swal.fire({
                title: "¿Estas seguro de marcar todas las notificaciones como leidas?",
                text: "Todas tus notificaciones pendientes se marcarán como leídas.",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Sí, marcar todas",
                cancelButtonText: "Cancelar",
                reverseButtons: true
            })
            if (respuesta.isConfirmed) {
                await marcarTodasNotificacionesLeidasService();
                setNotificaciones(prev =>
                    prev.map(notificacion => ({
                        ...notificacion,
                        leida: true
                    }))
                )
                setNoLeidas(0)
                await Swal.fire({
                    icon: "success",
                    title: "Notificaciones actualizadas",
                    text: "Todas las notificaciones fueron marcadas como leídas."
                })
            }
        }
        catch (error) {
            console.error("Error al marcar todas las notificaciones como leídas", error)
            await Swal.fire({
                icon: "error",
                title: "No se pudo eliminar",
                text:
                    mensajeBackend ||
                    "Ocurrió un error al eliminar la notificación."
            })

        }

    }

    const eliminarNotificacion = async (idNotificacion) => {
        const respuesta = await Swal.fire({
            title: "¿Eliminar notificación?",
            text: "Esta notificación será eliminada permanentemente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            reverseButtons: true
        })

        if (!respuesta.isConfirmed) return

        try {
            await eliminarNotificacionService(idNotificacion)

            setNotificaciones(prev =>
                prev.filter(
                    notificacion =>
                        notificacion.id !== idNotificacion
                )
            )

        } catch (error) {
            console.error("Error al eliminar notificacion como leídas", error)
            await Swal.fire({
                icon: "error",
                title: "No se pudo eliminar",
                text:
                    mensajeBackend ||
                    "Ocurrió un error al eliminar la notificación."
            })
        }
    }

    return {
        notificaciones,
        noLeidas,
        marcarLeida,
        marcarTodasLeidas,
        eliminarNotificacion,
        cargarNotificaciones,
        loading,
        error
    }
}