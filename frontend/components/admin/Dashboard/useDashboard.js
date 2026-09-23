"use client"
import { obtenerMetricasSistemaService, obtenerEstadisticasSistemaService } from "@/app/services/adminServices";
import { useEffect, useState } from "react";


export function useDashboard() {
    const [metricasTarjetas, setMetricasTarjetas] = useState(null)

    //citas
    const [citasPorEstado, setCitasPorEstado] = useState([]);
    const [citasPorMes, setCitasPorMes] = useState([]);
    const [citasPorEspecialidad, setCitasPorEspecialidad] = useState([]);

    //medicos
    const [medicosPorEspecialidad, setMedicosPorEspecialidad] = useState([]);
    const [medicosPorEstadoValidacion, setMedicosPorEstadoValidacion] = useState([]);
    const [solicitudesValidacionPorMes, setSolicitudesValidacionPorMes] = useState([]);

    //pacientes
    const [pacientesPorCitas, setPacientesPorCitas] = useState([]);
    const [pacientesPorEdad, setPacientesPorEdad] = useState([]);
    const [pacientesPorMes, setPacientesPorMes] = useState([]);

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

            //citas
            const citas = data.data.citas;

            setCitasPorEstado(citas.citas_por_estado);
            setCitasPorMes(citas.citas_por_mes);
            setCitasPorEspecialidad(citas.citas_por_especialidad)

            //medicos
            const medicos = data.data.medicos;

            setMedicosPorEspecialidad(medicos.medicos_por_especialidad);
            setMedicosPorEstadoValidacion(medicos.medicos_por_estado_validacion);
            setSolicitudesValidacionPorMes(medicos.solicitudes_validacion_por_mes);

            //pacientes
            const pacientes = data.data.pacientes;

            setPacientesPorCitas(pacientes.pacientes_por_citas);
            setPacientesPorEdad(pacientes.pacientes_por_edad);
            setPacientesPorMes(pacientes.pacientes_por_mes);

        } catch (error) {
            console.log("Error al cargar las estadísticas");
        }
    };

    return { metricasTarjetas, citasPorEstado, citasPorMes, citasPorEspecialidad, medicosPorEspecialidad, medicosPorEstadoValidacion, solicitudesValidacionPorMes, pacientesPorCitas,pacientesPorEdad,pacientesPorMes }
}
