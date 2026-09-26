"use client"
import { obtenerMetricasSistemaService, obtenerEstadisticasCitasService, obtenerEstadisticasMedicosService, obtenerEstadisticasPacientesService } from "@/app/services/adminServices";
import { useEffect, useState } from "react";


export function useDashboard() {
    const [metricasTarjetas, setMetricasTarjetas] = useState(null)

    //citas
    const [citasPorEstado, setCitasPorEstado] = useState([]);
    const [citasPorMes, setCitasPorMes] = useState([]);
    const [citasPorEspecialidad, setCitasPorEspecialidad] = useState([]);
    const [citasPorDiaSemana, setCitasPorDiaSemana] = useState([]);
    const [citasPorHora, setCitasPorHora] = useState([]);
    const [tasaCancelacion, setTasaCancelacion] = useState(null);

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
        cargarEstadisticasPacientes();
        cargarEstadisticasCitas();
        cargarEstadisticasMedicos();
    }, [])
    const cargarMetricasTarjetas = async () => {
        try {
            const data = await obtenerMetricasSistemaService()
            setMetricasTarjetas(data.data)
        } catch (error) {
            console.log("Error en el servidor")
        }
    }

    const cargarEstadisticasCitas = async () => {
        try {
            const data = await obtenerEstadisticasCitasService()
            const citas = data.data

            setCitasPorEstado(citas.citas_por_estado);
            setCitasPorMes(citas.citas_por_mes);
            setCitasPorEspecialidad(citas.citas_por_especialidad)
            setCitasPorDiaSemana(citas.citas_por_dia_semana);
            setCitasPorHora(citas.citas_por_hora);
            setTasaCancelacion(citas.tasa_cancelacion);

        } catch (error) {
            console.log("Error al cargar las estadísticas de citas");
        }
    }

    const cargarEstadisticasMedicos = async () => {
        try {
            const data = await obtenerEstadisticasMedicosService()

            const medicos = data.data;

            setMedicosPorEspecialidad(medicos.medicos_por_especialidad);
            setMedicosPorEstadoValidacion(medicos.medicos_por_estado_validacion);
            setSolicitudesValidacionPorMes(medicos.solicitudes_validacion_por_mes);

        } catch (error) {
            console.log("Error al cargar las estadísticas de medicos");
        }
    }

    const cargarEstadisticasPacientes = async () => {
        try {
            const data = await obtenerEstadisticasPacientesService()
            const pacientes = data.data

            setPacientesPorCitas(pacientes.pacientes_por_citas);
            setPacientesPorEdad(pacientes.pacientes_por_edad);
            setPacientesPorMes(pacientes.pacientes_por_mes);

        } catch (error) {
            console.log("Error al cargar las estadísticas de pacientes");
        }
    }

    return { 
        metricasTarjetas, 
        
        //citas
        citasPorEstado,
        citasPorMes,
        citasPorEspecialidad,
        citasPorDiaSemana,
        citasPorHora,
        tasaCancelacion,

        //medicos
        medicosPorEspecialidad,
        medicosPorEstadoValidacion,
        solicitudesValidacionPorMes, 

        //pacientes
        pacientesPorEdad, 
        pacientesPorMes,
        pacientesPorCitas,
    }
}
