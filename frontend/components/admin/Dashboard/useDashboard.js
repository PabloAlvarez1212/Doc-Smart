"use client";

import {
    obtenerEstadisticasCitasService,
    obtenerEstadisticasMedicosService,
    obtenerEstadisticasPacientesService,
    obtenerMetricasSistemaService,
} from "@/app/services/adminServices";
import { useEffect, useRef, useState } from "react";

/** @typedef {"mes"|"dia"} AgrupacionPeriodo */
/** @typedef {{periodo: string, total: number}} CitaPeriodo */
/** @typedef {{agrupacion: AgrupacionPeriodo, datos: CitaPeriodo[]}} CitasCreadasPorPeriodo */
/** @typedef {{especialidad: string, total_citas: number}} CitaPorEspecialidad */
/** @typedef {{estado: string, total: number}} CitaPorEstado */
/** @typedef {{anio: number|null, mes: number|null, anios_disponibles: number[]}} FiltrosCitas */
/** @typedef {{periodo: string, total_solicitudes: number}} SolicitudValidacionPeriodo */
/** @typedef {{agrupacion: AgrupacionPeriodo, datos: SolicitudValidacionPeriodo[]}} SolicitudesValidacionPorPeriodo */
/** @typedef {{anio: number|null, mes: number|null, anios_disponibles: number[]}} FiltrosMedicos */
/** @typedef {"pendiente"|"rechazado"|"sin_solicitud"} EstadoMedicoNoAprobado */
/** @typedef {{especialidad: string, estado: EstadoMedicoNoAprobado, total_medicos: number}} MedicoNoAprobadoPorEspecialidad */
/** @typedef {{periodo: string, total_pacientes: number}} PacientePeriodo */
/** @typedef {{agrupacion: AgrupacionPeriodo, datos: PacientePeriodo[]}} PacientesPorPeriodo */
/** @typedef {{anio: number|null, mes: number|null, anios_disponibles: number[]}} FiltrosPacientes */

const EMPTY_APPOINTMENT_ACTIVITY = {
    agrupacion: "mes",
    datos: [],
};

const EMPTY_APPOINTMENT_FILTERS = {
    anio: null,
    mes: null,
    anios_disponibles: [],
};

const EMPTY_VALIDATION_REQUESTS = {
    agrupacion: "mes",
    datos: [],
};

const EMPTY_DOCTOR_FILTERS = {
    anio: null,
    mes: null,
    anios_disponibles: [],
};

const EMPTY_PATIENT_PERIOD = {
    agrupacion: "mes",
    datos: [],
};

const EMPTY_PATIENT_FILTERS = {
    anio: null,
    mes: null,
    anios_disponibles: [],
};

export function useDashboard() {
    const [metricasTarjetas, setMetricasTarjetas] = useState(null);
    const [loadingMetricas, setLoadingMetricas] = useState(true);
    const [errorMetricas, setErrorMetricas] = useState(false);

    const [citasPorEstado, setCitasPorEstado] = useState(
        /** @type {CitaPorEstado[]} */ ([])
    );
    const [citasCreadasPorEstado, setCitasCreadasPorEstado] = useState(
        /** @type {CitaPorEstado[]} */ ([])
    );
    const [citasCreadasPorPeriodo, setCitasCreadasPorPeriodo] = useState(
        /** @type {CitasCreadasPorPeriodo} */ (EMPTY_APPOINTMENT_ACTIVITY)
    );
    const [filtrosCitas, setFiltrosCitas] = useState(
        /** @type {FiltrosCitas} */ (EMPTY_APPOINTMENT_FILTERS)
    );
    const [citasPorEspecialidad, setCitasPorEspecialidad] = useState(
        /** @type {CitaPorEspecialidad[]} */ ([])
    );
    const [citasCreadasPorEspecialidad, setCitasCreadasPorEspecialidad] = useState(
        /** @type {CitaPorEspecialidad[]} */ ([])
    );
    const [citasPorDiaSemana, setCitasPorDiaSemana] = useState([]);
    const [citasPorHora, setCitasPorHora] = useState([]);
    const [loadingCitas, setLoadingCitas] = useState(true);
    const [errorCitas, setErrorCitas] = useState(false);
    const appointmentRequestRef = useRef(null);

    const [medicosPorEspecialidad, setMedicosPorEspecialidad] = useState([]);
    const [medicosNoAprobadosPorEspecialidad, setMedicosNoAprobadosPorEspecialidad] = useState(
        /** @type {MedicoNoAprobadoPorEspecialidad[]} */ ([])
    );
    const [medicosPorEstadoValidacion, setMedicosPorEstadoValidacion] = useState([]);
    const [solicitudesValidacionPorPeriodo, setSolicitudesValidacionPorPeriodo] = useState(
        /** @type {SolicitudesValidacionPorPeriodo} */ (EMPTY_VALIDATION_REQUESTS)
    );
    const [filtrosMedicos, setFiltrosMedicos] = useState(
        /** @type {FiltrosMedicos} */ (EMPTY_DOCTOR_FILTERS)
    );
    const [medicosQueMasAtienden, setMedicosQueMasAtienden] = useState([]);
    const [tiempoPromedioValidacion, setTiempoPromedioValidacion] = useState(null);
    const [loadingMedicos, setLoadingMedicos] = useState(true);
    const [errorMedicos, setErrorMedicos] = useState(false);
    const doctorRequestRef = useRef(null);

    const [pacientesPorEdad, setPacientesPorEdad] = useState([]);
    const [pacientesRegistradosPorPeriodo, setPacientesRegistradosPorPeriodo] = useState(
        /** @type {PacientesPorPeriodo} */ (EMPTY_PATIENT_PERIOD)
    );
    const [pacientesPorCantidadCitas, setPacientesPorCantidadCitas] = useState([]);
    const [pacientesActivosPorPeriodo, setPacientesActivosPorPeriodo] = useState(
        /** @type {PacientesPorPeriodo} */ (EMPTY_PATIENT_PERIOD)
    );
    const [filtrosPacientes, setFiltrosPacientes] = useState(
        /** @type {FiltrosPacientes} */ (EMPTY_PATIENT_FILTERS)
    );
    const [loadingPacientes, setLoadingPacientes] = useState(true);
    const [errorPacientes, setErrorPacientes] = useState(false);
    const patientRequestRef = useRef(null);

    useEffect(() => {
        cargarMetricasTarjetas();
        cargarEstadisticasPacientes();
        cargarEstadisticasCitas();
        cargarEstadisticasMedicos();

        return () => {
            appointmentRequestRef.current?.abort();
            doctorRequestRef.current?.abort();
            patientRequestRef.current?.abort();
        };
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
        setCitasCreadasPorEstado([]);
        setCitasCreadasPorPeriodo(EMPTY_APPOINTMENT_ACTIVITY);
        setCitasPorEspecialidad([]);
        setCitasCreadasPorEspecialidad([]);
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

            setCitasPorEstado(
                Array.isArray(citas.citas_por_estado)
                    ? citas.citas_por_estado
                    : []
            );
            setCitasCreadasPorEstado(
                Array.isArray(citas.citas_creadas_por_estado)
                    ? citas.citas_creadas_por_estado
                    : []
            );
            setCitasCreadasPorPeriodo({
                agrupacion: activity?.agrupacion === "dia" ? "dia" : "mes",
                datos: Array.isArray(activity?.datos) ? activity.datos : [],
            });
            setCitasPorEspecialidad(
                Array.isArray(citas.citas_por_especialidad)
                    ? citas.citas_por_especialidad
                    : []
            );
            setCitasCreadasPorEspecialidad(
                Array.isArray(citas.citas_creadas_por_especialidad)
                    ? citas.citas_creadas_por_especialidad
                    : []
            );
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

    const limpiarDatosMedicos = () => {
        setMedicosPorEspecialidad([]);
        setMedicosNoAprobadosPorEspecialidad([]);
        setMedicosPorEstadoValidacion([]);
        setSolicitudesValidacionPorPeriodo(EMPTY_VALIDATION_REQUESTS);
        setMedicosQueMasAtienden([]);
        setTiempoPromedioValidacion(null);
    };

    const cargarEstadisticasMedicos = async (anio, mes) => {
        doctorRequestRef.current?.abort();
        const controller = new AbortController();
        doctorRequestRef.current = controller;

        try {
            setLoadingMedicos(true);
            setErrorMedicos(false);
            limpiarDatosMedicos();

            const data = await obtenerEstadisticasMedicosService(
                anio,
                mes,
                controller.signal
            );

            if (controller.signal.aborted) return;

            const medicos = data.data;
            const validationRequests = medicos.solicitudes_validacion_por_periodo;
            const filters = medicos.filtros;

            setMedicosPorEspecialidad(medicos.medicos_por_especialidad ?? []);
            setMedicosNoAprobadosPorEspecialidad(
                Array.isArray(medicos.medicos_no_aprobados_por_especialidad)
                    ? medicos.medicos_no_aprobados_por_especialidad
                    : []
            );
            setMedicosPorEstadoValidacion(medicos.medicos_por_estado_validacion ?? []);
            setSolicitudesValidacionPorPeriodo({
                agrupacion: validationRequests?.agrupacion === "dia" ? "dia" : "mes",
                datos: Array.isArray(validationRequests?.datos)
                    ? validationRequests.datos
                    : [],
            });
            setMedicosQueMasAtienden(medicos.medicos_que_mas_atienden ?? []);
            setTiempoPromedioValidacion(medicos.tiempo_promedio_validacion ?? null);
            setFiltrosMedicos({
                anio: Number.isInteger(filters?.anio) ? filters.anio : null,
                mes: Number.isInteger(filters?.mes) ? filters.mes : null,
                anios_disponibles: Array.isArray(filters?.anios_disponibles)
                    ? filters.anios_disponibles
                    : [],
            });
        } catch {
            if (!controller.signal.aborted) {
                setErrorMedicos(true);
            }
        } finally {
            if (
                !controller.signal.aborted
                && doctorRequestRef.current === controller
            ) {
                setLoadingMedicos(false);
            }
        }
    };

    const cambiarAnioMedicos = (value) => {
        const anio = Number(value);
        if (!Number.isInteger(anio)) return;

        const mes = filtrosMedicos.mes;
        setFiltrosMedicos((current) => ({ ...current, anio }));
        cargarEstadisticasMedicos(anio, mes);
    };

    const cambiarMesMedicos = (value) => {
        const mes = value === null || value === "" ? null : Number(value);
        if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return;
        if (!Number.isInteger(filtrosMedicos.anio)) return;

        setFiltrosMedicos((current) => ({ ...current, mes }));
        cargarEstadisticasMedicos(filtrosMedicos.anio, mes);
    };

    const limpiarDatosPacientes = () => {
        setPacientesPorEdad([]);
        setPacientesRegistradosPorPeriodo(EMPTY_PATIENT_PERIOD);
        setPacientesPorCantidadCitas([]);
        setPacientesActivosPorPeriodo(EMPTY_PATIENT_PERIOD);
    };

    const cargarEstadisticasPacientes = async (anio, mes) => {
        patientRequestRef.current?.abort();
        const controller = new AbortController();
        patientRequestRef.current = controller;

        try {
            setLoadingPacientes(true);
            setErrorPacientes(false);
            limpiarDatosPacientes();

            const data = await obtenerEstadisticasPacientesService(
                anio,
                mes,
                controller.signal
            );

            if (controller.signal.aborted) return;

            const pacientes = data.data;
            const registeredPatients = pacientes.pacientes_registrados_por_periodo;
            const activePatients = pacientes.pacientes_activos_por_periodo;
            const filters = pacientes.filtros;

            setPacientesPorEdad(pacientes.pacientes_por_edad ?? []);
            setPacientesRegistradosPorPeriodo({
                agrupacion: registeredPatients?.agrupacion === "dia" ? "dia" : "mes",
                datos: Array.isArray(registeredPatients?.datos)
                    ? registeredPatients.datos
                    : [],
            });
            setPacientesPorCantidadCitas(pacientes.pacientes_por_cantidad_citas ?? []);
            setPacientesActivosPorPeriodo({
                agrupacion: activePatients?.agrupacion === "dia" ? "dia" : "mes",
                datos: Array.isArray(activePatients?.datos)
                    ? activePatients.datos
                    : [],
            });
            setFiltrosPacientes({
                anio: Number.isInteger(filters?.anio) ? filters.anio : null,
                mes: Number.isInteger(filters?.mes) ? filters.mes : null,
                anios_disponibles: Array.isArray(filters?.anios_disponibles)
                    ? filters.anios_disponibles
                    : [],
            });
        } catch {
            if (!controller.signal.aborted) {
                setErrorPacientes(true);
            }
        } finally {
            if (
                !controller.signal.aborted
                && patientRequestRef.current === controller
            ) {
                setLoadingPacientes(false);
            }
        }
    };

    const cambiarAnioPacientes = (value) => {
        const anio = Number(value);
        if (!Number.isInteger(anio)) return;

        const mes = filtrosPacientes.mes;
        setFiltrosPacientes((current) => ({ ...current, anio }));
        cargarEstadisticasPacientes(anio, mes);
    };

    const cambiarMesPacientes = (value) => {
        const mes = value === null || value === "" ? null : Number(value);
        if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return;
        if (!Number.isInteger(filtrosPacientes.anio)) return;

        setFiltrosPacientes((current) => ({ ...current, mes }));
        cargarEstadisticasPacientes(filtrosPacientes.anio, mes);
    };

    return {
        metricasTarjetas,
        loadingMetricas,
        errorMetricas,
        citasPorEstado,
        citasCreadasPorEstado,
        citasCreadasPorPeriodo,
        filtrosCitas,
        cambiarAnioCitas,
        cambiarMesCitas,
        citasPorEspecialidad,
        citasCreadasPorEspecialidad,
        citasPorDiaSemana,
        citasPorHora,
        loadingCitas,
        errorCitas,
        medicosPorEspecialidad,
        medicosNoAprobadosPorEspecialidad,
        medicosPorEstadoValidacion,
        solicitudesValidacionPorPeriodo,
        filtrosMedicos,
        cambiarAnioMedicos,
        cambiarMesMedicos,
        medicosQueMasAtienden,
        tiempoPromedioValidacion,
        loadingMedicos,
        errorMedicos,
        pacientesPorEdad,
        pacientesRegistradosPorPeriodo,
        pacientesPorCantidadCitas,
        pacientesActivosPorPeriodo,
        filtrosPacientes,
        cambiarAnioPacientes,
        cambiarMesPacientes,
        loadingPacientes,
        errorPacientes,
    };
}
