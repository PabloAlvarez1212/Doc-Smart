"use client"
import { useState, useEffect } from 'react'
import { obtenerDashboardPacienteInicioService } from '@/app/services/patientServices'

export const useDashboardPaciente = () => {
    const [dashboard, setDashboard] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const cargar = async () => {
            try {
                const data = await obtenerDashboardPacienteInicioService()
                setDashboard(data.data)
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }
        }
        cargar()
    }, [])

    return { dashboard, loading }
}