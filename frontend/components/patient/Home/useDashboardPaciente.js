"use client"
import { useState, useEffect } from 'react'
import { obtenerDashboardPacienteInicioService } from '@/app/services/patientServices'

export const useDashboardPaciente = () => {
    const [dashboard, setDashboard] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [requestVersion, setRequestVersion] = useState(0)

    useEffect(() => {
        let active = true

        const cargar = async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await obtenerDashboardPacienteInicioService()
                if (!data?.data) throw new Error("Respuesta de dashboard inválida")
                if (active) setDashboard(data.data)
            } catch {
                if (active) {
                    setDashboard(null)
                    setError("No pudimos cargar tu inicio en este momento.")
                }
            } finally {
                if (active) setLoading(false)
            }
        }
        cargar()

        return () => {
            active = false
        }
    }, [requestVersion])

    const retry = () => setRequestVersion((current) => current + 1)

    return { dashboard, loading, error, retry }
}
