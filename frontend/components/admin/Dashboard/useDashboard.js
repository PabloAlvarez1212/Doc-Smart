"use client"
import { obtenerMetricasSistemaService, obtenerEstadisticasSistemaService } from "@/app/services/adminServices";
import { useEffect, useState } from "react";


export function useDashboard() {
    const [metricasTarjetas, setMetricasTarjetas] = useState(null)
    const [citasPorEstado, setCitasPorEstado] = useState([]);
    const [citasPorMes, setCitasPorMes] = useState([]);
    const [citasPorEspecialidad,setCitasPorEspecialidad] = useState([]);
    useEffect(() => {
        cargarMetricasTarjetas();
        cargarEstadisticas();
    }, [])
    const cargarMetricasTarjetas = async () => {
        try {
            const data = await obtenerMetricasSistemaService()
            setMetricasTarjetas(data.data)
        } catch (error) {
            console.log("Error en el servidor")
        }
    }
    const cargarEstadisticas = async () => {
        try {
            const data = await obtenerEstadisticasSistemaService();
            setCitasPorEstado(data.data.citas.citas_por_estado);
            setCitasPorMes(data.data.citas.citas_por_mes);
            setCitasPorEspecialidad(data.data.citas.citas_por_especialidad)

        } catch (error) {
            console.log("Error al cargar las estadísticas");
        }
    };

    return { metricasTarjetas, citasPorEstado,citasPorMes,citasPorEspecialidad }
}
