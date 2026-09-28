"use client";

import {
    obtenerEstadisticasCitasService,
    obtenerEstadisticasMedicosService,
    obtenerEstadisticasPacientesService,
    obtenerMetricasSistemaService,
} from "@/app/services/adminServices";
import { useEffect, useRef, useState } from "react";

/** @typedef {"mes"|"dia"} AgrupacionCitas */
/** @typedef {{periodo: string, total: number}} CitaPeriodo */
/** @typedef {{agrupacion: AgrupacionCitas, datos: CitaPeriodo[]}} CitasCreadasPorPeriodo */
/** @typedef {{anio: number|null, mes: number|null, anios_disponibles: number[]}} FiltrosCitas */

const EMPTY_APPOINTMENT_ACTIVITY = {
    agrupacion: "mes",
    datos: [],
};

const EMPTY_APPOINTMENT_FILTERS = {
    anio: null,
    mes: null,
    anios_disponibles: [],
};

export function useDashboard() {
    const [metricasTarjetas, setMetricasTarjetas] = useState(null);
    const [loadingMetricas, setLoadingMetricas] = useState(true);
    const [errorMetricas, setErrorMetricas] = useState(false);

    const [citasPorEstado, setCitasPorEstado] = useState([]);
    const [citasCreadasPorPeriodo, setCitasCreadasPorPeriodo] = useState(
        /** @type {CitasCreadasPorPeriodo} */ (EMPTY_APPOINTMENT_ACTIVITY)
    );
    const [filtrosCitas, setFiltrosCitas] = useState(
        /** @type {FiltrosCitas} */ (EMPTY_APPOINTMENT_FILTERS)
    );
    const [citasPorEspecialidad, setCitasPorEspecialidad] = useState([]);
    const [citasPorDiaSemana, setCitasPorDiaSemana] = useState([]);
    const [citasPorHora, setCitasPorHora] = useState([]);
    const [loadingCitas, setLoadingCitas] = useState(true);
    const [errorCitas, setErrorCitas] = useState(false);
    const appointmentRequestRef = useRef(null);

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

        return () => appointmentRequestRef.current?.abort();
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

    const limpiarDatosCitas = () => {
        setCitasPorEstado([]);
        setCitasCreadasPorPeriodo(EMPTY_APPOINTMENT_ACTIVITY);
        setCitasPorEspecialidad([]);
        setCitasPorDiaSemana([]);
        setCitasPorHora([]);
    };

    const cargarEstadisticasCitas = async (anio, mes) => {
        appointmentRequestRef.current?.abort();
        const controller = new AbortController();
        appointmentRequestRef.current = controller;

        try {
            setLoadingCitas(true);
            setErrorCitas(false);
            limpiarDatosCitas();

            const data = await obtenerEstadisticasCitasService(
                anio,
                mes,
                controller.signal
            );

            if (controller.signal.aborted) return;

            const citas = data.data;
            const activity = citas.citas_creadas_por_periodo;
            const filters = citas.filtros;

            setCitasPorEstado(citas.citas_por_estado ?? []);
            setCitasCreadasPorPeriodo({
                agrupacion: activity?.agrupacion === "dia" ? "dia" : "mes",
                datos: Array.isArray(activity?.datos) ? activity.datos : [],
            });
            setCitasPorEspecialidad(citas.citas_por_especialidad ?? []);
            setCitasPorDiaSemana(citas.citas_por_dia_semana ?? []);
            setCitasPorHora(citas.citas_por_hora ?? []);
            setFiltrosCitas({
                anio: Number.isInteger(filters?.anio) ? filters.anio : null,
                mes: Number.isInteger(filters?.mes) ? filters.mes : null,
                anios_disponibles: Array.isArray(filters?.anios_disponibles)
                    ? filters.anios_disponibles
                    : [],
            });
        } catch {
            if (!controller.signal.aborted) {
                setErrorCitas(true);
            }
        } finally {
            if (
                !controller.signal.aborted
                && appointmentRequestRef.current === controller
            ) {
                setLoadingCitas(false);
            }
        }
    };

    const cambiarAnioCitas = (value) => {
        const anio = Number(value);
        if (!Number.isInteger(anio)) return;

        const mes = filtrosCitas.mes;
        setFiltrosCitas((current) => ({ ...current, anio }));
        cargarEstadisticasCitas(anio, mes);
    };

    const cambiarMesCitas = (value) => {
        const mes = value === null || value === "" ? null : Number(value);
        if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return;
        if (!Number.isInteger(filtrosCitas.anio)) return;

        setFiltrosCitas((current) => ({ ...current, mes }));
        cargarEstadisticasCitas(filtrosCitas.anio, mes);
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
        citasCreadasPorPeriodo,
        filtrosCitas,
        cambiarAnioCitas,
        cambiarMesCitas,
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
