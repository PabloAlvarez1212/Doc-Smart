"use client"
import { useState, useEffect, useRef } from 'react'

export const useNotificaciones = (userId, options = {}) => {
    const { initialData = [], onEventoCita } = options
    const [notificaciones, setNotificaciones] = useState(initialData)
    const [noLeidas, setNoLeidas] = useState(0)
    const ws = useRef(null)

    // Sincronizar notificaciones iniciales cuando `initialData` cargue de la API REST
    useEffect(() => {
        if (initialData && initialData.length > 0) {
            setNotificaciones(initialData)
        }
    }, [initialData])

    const onEventoCitaRef = useRef(onEventoCita)
    useEffect(() => {
        onEventoCitaRef.current = onEventoCita
    }, [onEventoCita])

    useEffect(() => {
        if (!userId) return

        ws.current = new WebSocket(`ws://localhost:8000/ws/notificaciones/${userId}/`)

        ws.current.onopen = () => {
            console.log('WebSocket conectado')
        }

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            console.log('📩 Evento recibido:', data)

            if (data.type === 'count_initial') {
                setNoLeidas(data.count)
            }

            if (data.type === 'notification_update') {
                setNoLeidas(data.count)

                if (data.notificacion) {
                    // Se agrega la notificación nueva al inicio MANTENIENDO las anteriores
                    setNotificaciones(prev => {
                        // Evita duplicados si la notificación ya existe
                        const existe = prev.some(n => n.id === data.notificacion.id)
                        if (existe) return prev
                        return [data.notificacion, ...prev]
                    })

                    const citaData = data.cita || data.notificacion?.extra_data?.cita
                    const tipoEvento = data.tipo_evento || data.notificacion?.extra_data?.tipo_evento

                    if (citaData && onEventoCitaRef.current) {
                        onEventoCitaRef.current({
                            tipo_evento: tipoEvento,
                            cita: citaData,
                            notificacion: data.notificacion
                        })
                    }
                }
            }
        }

        ws.current.onclose = () => console.log('WebSocket desconectado')
        ws.current.onerror = (error) => console.log('WebSocket error:', error)

        return () => {
            if (ws.current) ws.current.close()
        }
    }, [userId])

    const marcarLeida = (id) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'marcar_leida',
                id: id
            }))
        }
        setNotificaciones(prev =>
            prev.map(n => n.id === id ? { ...n, leida: true } : n)
        )
        setNoLeidas(prev => Math.max(0, prev - 1))
    }

    const marcarTodasLeidas = () => {
        notificaciones
            .filter(n => !n.leida)
            .forEach(n => marcarLeida(n.id))
    }

    return { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas }
}