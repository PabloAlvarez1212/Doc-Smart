"use client"
import Swal from "sweetalert2"
import { useState, useEffect, useRef } from "react"
import {
    obtenerNotificacionesService,
    marcarNotificacionLeidaService,
    marcarTodasNotificacionesLeidasService,
    eliminarNotificacionService,
    eliminarTodasNotificacionesService,
} from "@/app/services/notificationsServices"
import { obtenerPrimerError } from "@/app/utils/errrorUtils"

export const useNotificaciones = () => {

    const [eventoCita, setEventoCita] = useState(null)

    const [notificaciones, setNotificaciones] = useState([])
    const [noLeidas, setNoLeidas] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);

    const ws = useRef(null)

    const cargarNotificaciones = async () => {
        try {
            setLoading(true)
            setError(null)

            const params = {
                page: paginaActual,
                page_size: 6
            }

            const response = await obtenerNotificacionesService(params)

            const data = response?.data?.data ?? []
            const paginacion = response?.data?.paginacion ?? null

            setNotificaciones(
                Array.isArray(data)
                    ? data
                    : []
            )

            if (paginacion) {
                setPaginaActual(
                    paginacion.current_page
                )

                setTotalPaginas(
                    paginacion.total_pages
                )

                setTotalRegistros(
                    paginacion.count
                )
            }

        } catch (error) {
            console.error(error)

            setError(
                "No se pudieron cargar las notificaciones."
            )
        } finally {
            setLoading(false)
        }
    }

    const cambiarPagina = (nuevaPagina) => {
        setPaginaActual(nuevaPagina);
    };

    useEffect(() => {
        cargarNotificaciones()
    }, [paginaActual])

    useEffect(() => {
        const WS_URL = process.env.NEXT_PUBLIC_WS_URL

        if (!WS_URL) {
            console.error(
                "NEXT_PUBLIC_WS_URL no está configurada"
            )
            return
        }

        let socket = null
        let reconnectTimer = null
        let intentos = 0
        let desmontado = false

        const MAX_DELAY = 30000

        const conectar = () => {
            if (desmontado) {
                return
            }

            // Evitar conexiones duplicadas
            if (
                socket &&
                (
                    socket.readyState === WebSocket.OPEN ||
                    socket.readyState === WebSocket.CONNECTING
                )
            ) {
                return
            }

            const websocketUrl =
                `${WS_URL}/ws/notificaciones/`

            socket = new WebSocket(websocketUrl)
            ws.current = socket

            // Conexión exitosa
            socket.onopen = () => {
                intentos = 0
            }

            // Mensajes recibidos
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)

                    // Cantidad inicial
                    if (data.type === "count_initial") {
                        setNoLeidas(data.count)
                        return
                    }

                    // Nueva notificación o actualización
                    if (data.type === "notification_update") {
                        setNoLeidas(data.count)

                        if (data.notificacion) {
                            setNotificaciones(prev => {
                                const existe = prev.some(
                                    notificacion =>
                                        notificacion.id ===
                                        data.notificacion.id
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

                            if (citaData) {
                                setEventoCita({
                                    tipo_evento: tipoEvento,
                                    cita: citaData,
                                    notificacion: data.notificacion
                                })
                            }
                        }
                    }

                } catch (error) {
                    console.error(
                        "Error procesando mensaje WebSocket:",
                        error
                    )
                }
            }

            // El cierre manejará la reconexión.
            socket.onerror = () => { }

            socket.onclose = (event) => {
                if (ws.current === socket) {
                    ws.current = null
                }

                // No reconectar si el componente fue desmontado
                if (desmontado) {
                    return
                }

                // No reconectar ante errores de autenticación/autorización
                if (
                    event.code === 4401 ||
                    event.code === 4403
                ) {
                    return
                }

                intentos += 1

                const delay = Math.min(
                    2000 * Math.pow(2, intentos - 1),
                    MAX_DELAY
                )

                reconnectTimer = setTimeout(() => {
                    conectar()
                }, delay)
            }
        }

        conectar()

        return () => {
            desmontado = true

            if (reconnectTimer) {
                clearTimeout(reconnectTimer)
            }

            if (socket) {
                socket.onopen = null
                socket.onmessage = null
                socket.onerror = null
                socket.onclose = null

                if (
                    socket.readyState === WebSocket.OPEN ||
                    socket.readyState === WebSocket.CONNECTING
                ) {
                    socket.close()
                }
            }

            if (ws.current === socket) {
                ws.current = null
            }
        }

    }, [])

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
            console.error("Error al marcar la notificación como leída", error)
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

    const eliminarTodasNotificaciones = async () => {
        if (notificaciones.length === 0) return
        const respuesta = await Swal.fire({
            title: "¿Eliminar todas las notificaciones?",
            text: "Esta acción eliminará permanentemente todas tus notificaciones.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar todas",
            cancelButtonText: "Cancelar",
            reverseButtons: true
        })
        if (!respuesta.isConfirmed) return

        try {
            await eliminarTodasNotificacionesService()
            setNotificaciones([])
            setNoLeidas(0)
            await Swal.fire({
                icon: "success",
                title: "Notificaciones eliminadas",
                text: "Todas las notificaciones fueron eliminadas correctamente."
            })
        } catch (error) {
            const mensajeBackend = obtenerPrimerError(
                error.response?.data?.errores
            )
            await Swal.fire({
                icon: "error",
                title: "No se pudieron eliminar",
                text:
                    mensajeBackend ||
                    "Ocurrió un error al eliminar las notificaciones."
            })
        }
    }

    return {
        notificaciones,
        noLeidas,
        marcarLeida,
        marcarTodasLeidas,
        eliminarNotificacion,
        eliminarTodasNotificaciones,
        cargarNotificaciones,
        eventoCita,
        loading,
        cambiarPagina,
        paginaActual,
        totalPaginas,
        totalRegistros,
        error
    }
}