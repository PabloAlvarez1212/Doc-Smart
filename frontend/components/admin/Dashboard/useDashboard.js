"use client";

import {
    obtenerEstadisticasCitasService,
    obtenerEstadisticasMedicosService,
    obtenerEstadisticasPacientesService,
    obtenerMetricasSistemaService,
} from "@/app/services/adminServices";
import { useEffect, useState } from "react";

export function useDashboard() {
    const [metricasTarjetas, setMetricasTarjetas] = useState(null);
    const [loadingMetricas, setLoadingMetricas] = useState(true);
    const [errorMetricas, setErrorMetricas] = useState(false);

    const [citasPorEstado, setCitasPorEstado] = useState([]);
    const [citasPorMes, setCitasPorMes] = useState([]);
    const [citasPorEspecialidad, setCitasPorEspecialidad] = useState([]);
    const [citasPorDiaSemana, setCitasPorDiaSemana] = useState([]);
    const [citasPorHora, setCitasPorHora] = useState([]);
    const [loadingCitas, setLoadingCitas] = useState(true);
    const [errorCitas, setErrorCitas] = useState(false);

    const [medicosPorEspecialidad, setMedicosPorEspecialidad] = useState([]);
    const [medicosPorEstadoValidacion, setMedicosPorEstadoValidacion] = useState([]);
    const [solicitudesValidacionPorMes, setSolicitudesValidacionPorMes] = useState([]);
    const [medicosQueMasAtienden, setMedicosQueMasAtienden] = useState([]);
    const [tiempoPromedioValidacion, setTiempoPromedioValidacion] = useState(null);
    const [loadingMedicos, setLoadingMedicos] = useState(true);
    const [errorMedicos, setErrorMedicos] = useState(false);

    const [pacientesPorEdad, setPacientesPorEdad] = useState([]);
    const [pacientesPorMes, setPacientesPorMes] = useState([]);
    const [pacientesPorCantidadCitas, setPacientesPorCantidadCitas] = useState([]);
    const [pacientesActivosPorMes, setPacientesActivosPorMes] = useState([]);
    const [loadingPacientes, setLoadingPacientes] = useState(true);
    const [errorPacientes, setErrorPacientes] = useState(false);

    useEffect(() => {
        cargarMetricasTarjetas();
        cargarEstadisticasPacientes();
        cargarEstadisticasCitas();
        cargarEstadisticasMedicos();
    }, []);

    const cargarMetricasTarjetas = async () => {
        try {
            setErrorMetricas(false);
            const data = await obtenerMetricasSistemaService();
            setMetricasTarjetas(data.data);
        } catch {
            setMetricasTarjetas(null);
            setErrorMetricas(true);
        } finally {
            setLoadingMetricas(false);
        }
    };

    const cargarEstadisticasCitas = async () => {
        try {
            setErrorCitas(false);
            const data = await obtenerEstadisticasCitasService();
            const citas = data.data;

            setCitasPorEstado(citas.citas_por_estado ?? []);
            setCitasPorMes(citas.citas_por_mes ?? []);
            setCitasPorEspecialidad(citas.citas_por_especialidad ?? []);
            setCitasPorDiaSemana(citas.citas_por_dia_semana ?? []);
            setCitasPorHora(citas.citas_por_hora ?? []);
        } catch {
            setErrorCitas(true);
        } finally {
            setLoadingCitas(false);
        }
    };

    const cargarEstadisticasMedicos = async () => {
        try {
            setErrorMedicos(false);
            const data = await obtenerEstadisticasMedicosService();
            const medicos = data.data;

            setMedicosPorEspecialidad(medicos.medicos_por_especialidad ?? []);
            setMedicosPorEstadoValidacion(medicos.medicos_por_estado_validacion ?? []);
            setSolicitudesValidacionPorMes(medicos.solicitudes_validacion_por_mes ?? []);
            setMedicosQueMasAtienden(medicos.medicos_que_mas_atienden ?? []);
            setTiempoPromedioValidacion(medicos.tiempo_promedio_validacion ?? null);
        } catch {
            setErrorMedicos(true);
        } finally {
            setLoadingMedicos(false);
        }
    };

    const cargarEstadisticasPacientes = async () => {
        try {
            setErrorPacientes(false);
            const data = await obtenerEstadisticasPacientesService();
            const pacientes = data.data;

            setPacientesPorEdad(pacientes.pacientes_por_edad ?? []);
            setPacientesPorMes(pacientes.pacientes_por_mes ?? []);
            setPacientesPorCantidadCitas(pacientes.pacientes_por_cantidad_citas ?? []);
            setPacientesActivosPorMes(pacientes.pacientes_activos_por_mes ?? []);
        } catch {
            setErrorPacientes(true);
        } finally {
            setLoadingPacientes(false);
        }
    };

    return {
        metricasTarjetas,
        loadingMetricas,
        errorMetricas,
        citasPorEstado,
        citasPorMes,
        citasPorEspecialidad,
        citasPorDiaSemana,
        citasPorHora,
        loadingCitas,
        errorCitas,
        medicosPorEspecialidad,
        medicosPorEstadoValidacion,
        solicitudesValidacionPorMes,
        medicosQueMasAtienden,
        tiempoPromedioValidacion,
        loadingMedicos,
        errorMedicos,
        pacientesPorEdad,
        pacientesPorMes,
        pacientesPorCantidadCitas,
        pacientesActivosPorMes,
        loadingPacientes,
        errorPacientes,
    };
}
