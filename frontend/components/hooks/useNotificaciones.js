"use client"
// hooks/useNotificaciones.js
import { useState, useEffect, useRef } from 'react'

export const useNotificaciones = (userId) => {
    const [notificaciones, setNotificaciones] = useState([])
    const [noLeidas, setNoLeidas] = useState(0)
    const ws = useRef(null)

    useEffect(() => {
        if (!userId) return

        // Conectar WebSocket
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
                    setNotificaciones(prev => [data.notificacion, ...prev])
                }
            }
        }

        ws.current.onclose = () => {
            console.log('WebSocket desconectado')
        }

        ws.current.onerror = (error) => {
            console.log('WebSocket error:', error)
        }

        // Limpiar al desmontar
        return () => {
            if (ws.current) {
                ws.current.close()
            }
        }

    }, [userId])

    const marcarLeida = (id) => {
        //  Verificación de seguridad: solo enviar si el socket está abierto
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'marcar_leida',
                id: id
            }))
        }

        // Actualizar estado local inmediatamente (Optimistic UI)
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