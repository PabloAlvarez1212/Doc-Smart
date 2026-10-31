"use client";

import {
    obtenerEstadisticasCitasService,
    obtenerEstadisticasMedicosService,
    obtenerEstadisticasPacientesService,
    obtenerMetricasSistemaService,
} from "@/app/services/adminServices";
import { useEffect, useRef, useState } from "react";
import { useNotificationsContext } from "../../contex/NotificationsContext";
import { sectionsAfterConnection, splitDashboardRefresh, validDashboardSections } from "./dashboardRealtime.mjs";

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
    const { eventoDashboard, versionConexion } = useNotificationsContext();
    const metricsRequestRef = useRef(null);
    const mountedRef = useRef(false);
    const refreshTimerRef = useRef(null);
    const pendingSectionsRef = useRef(new Set());
    const seenEventsRef = useRef(new Set());
    const initialConnectionRef = useRef(false);
    const dayRef = useRef(new Date().toDateString());
    const appliedFiltersRef = useRef({
        citas: { anio: null, mes: null },
        medicos: { anio: null, mes: null },
        pacientes: { anio: null, mes: null },
    });
    const hasDataRef = useRef({ resumen: false, citas: false, medicos: false, pacientes: false });
    const manualPendingRef = useRef(new Set());
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
        mountedRef.current = true;
        cargarMetricasTarjetas();
        cargarEstadisticasPacientes();
        cargarEstadisticasCitas();
        cargarEstadisticasMedicos();

        return () => {
            mountedRef.current = false;
            clearTimeout(refreshTimerRef.current);
            metricsRequestRef.current?.abort();
            appointmentRequestRef.current?.abort();
            doctorRequestRef.current?.abort();
            patientRequestRef.current?.abort();
        };
    }, []);

    const cargarMetricasTarjetas = async () => {
        metricsRequestRef.current?.abort();
        const controller = new AbortController();
        metricsRequestRef.current = controller;
        try {
            setErrorMetricas(false);
            const data = await obtenerMetricasSistemaService(controller.signal);
            if (controller.signal.aborted || !mountedRef.current) return;
            setMetricasTarjetas(data.data);
            hasDataRef.current.resumen = true;
        } catch {
            if (!controller.signal.aborted && mountedRef.current) setErrorMetricas(true);
        } finally {
            if (!controller.signal.aborted && mountedRef.current) setLoadingMetricas(false);
        }
    };

    const cargarEstadisticasCitas = async (anio, mes, manual = false) => {
        appointmentRequestRef.current?.abort();
        const controller = new AbortController();
        appointmentRequestRef.current = controller;
        if (manual) manualPendingRef.current.add("citas");

        try {
            if (!hasDataRef.current.citas) setLoadingCitas(true);
            setErrorCitas(false);

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
            hasDataRef.current.citas = true;
        } catch {
            if (!controller.signal.aborted) {
                if (!hasDataRef.current.citas) setErrorCitas(true);
            }
        } finally {
            if (
                !controller.signal.aborted
                && appointmentRequestRef.current === controller
            ) {
                setLoadingCitas(false);
                manualPendingRef.current.delete("citas");
            }
        }
    };

    const cambiarAnioCitas = (value) => {
        const anio = Number(value);
        if (!Number.isInteger(anio)) return;

        const mes = filtrosCitas.mes;
        pendingSectionsRef.current.delete("citas");
        appliedFiltersRef.current.citas = { anio, mes };
        setFiltrosCitas((current) => ({ ...current, anio }));
        cargarEstadisticasCitas(anio, mes, true);
    };

    const cambiarMesCitas = (value) => {
        const mes = value === null || value === "" ? null : Number(value);
        if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return;
        if (!Number.isInteger(filtrosCitas.anio)) return;

        pendingSectionsRef.current.delete("citas");
        appliedFiltersRef.current.citas = { anio: filtrosCitas.anio, mes };

        setFiltrosCitas((current) => ({ ...current, mes }));
        cargarEstadisticasCitas(filtrosCitas.anio, mes, true);
    };

    const cargarEstadisticasMedicos = async (anio, mes, manual = false) => {
        doctorRequestRef.current?.abort();
        const controller = new AbortController();
        doctorRequestRef.current = controller;
        if (manual) manualPendingRef.current.add("medicos");

        try {
            if (!hasDataRef.current.medicos) setLoadingMedicos(true);
            setErrorMedicos(false);

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
            hasDataRef.current.medicos = true;
        } catch {
            if (!controller.signal.aborted) {
                if (!hasDataRef.current.medicos) setErrorMedicos(true);
            }
        } finally {
            if (
                !controller.signal.aborted
                && doctorRequestRef.current === controller
            ) {
                setLoadingMedicos(false);
                manualPendingRef.current.delete("medicos");
            }
        }
    };

    const cambiarAnioMedicos = (value) => {
        const anio = Number(value);
        if (!Number.isInteger(anio)) return;

        const mes = filtrosMedicos.mes;
        pendingSectionsRef.current.delete("medicos");
        appliedFiltersRef.current.medicos = { anio, mes };
        setFiltrosMedicos((current) => ({ ...current, anio }));
        cargarEstadisticasMedicos(anio, mes, true);
    };

    const cambiarMesMedicos = (value) => {
        const mes = value === null || value === "" ? null : Number(value);
        if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return;
        if (!Number.isInteger(filtrosMedicos.anio)) return;

        pendingSectionsRef.current.delete("medicos");
        appliedFiltersRef.current.medicos = { anio: filtrosMedicos.anio, mes };

        setFiltrosMedicos((current) => ({ ...current, mes }));
        cargarEstadisticasMedicos(filtrosMedicos.anio, mes, true);
    };

    const cargarEstadisticasPacientes = async (anio, mes, manual = false) => {
        patientRequestRef.current?.abort();
        const controller = new AbortController();
        patientRequestRef.current = controller;
        if (manual) manualPendingRef.current.add("pacientes");

        try {
            if (!hasDataRef.current.pacientes) setLoadingPacientes(true);
            setErrorPacientes(false);

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
            hasDataRef.current.pacientes = true;
        } catch {
            if (!controller.signal.aborted) {
                if (!hasDataRef.current.pacientes) setErrorPacientes(true);
            }
        } finally {
            if (
                !controller.signal.aborted
                && patientRequestRef.current === controller
            ) {
                setLoadingPacientes(false);
                manualPendingRef.current.delete("pacientes");
            }
        }
    };

    const cambiarAnioPacientes = (value) => {
        const anio = Number(value);
        if (!Number.isInteger(anio)) return;

        const mes = filtrosPacientes.mes;
        pendingSectionsRef.current.delete("pacientes");
        appliedFiltersRef.current.pacientes = { anio, mes };
        setFiltrosPacientes((current) => ({ ...current, anio }));
        cargarEstadisticasPacientes(anio, mes, true);
    };

    const cambiarMesPacientes = (value) => {
        const mes = value === null || value === "" ? null : Number(value);
        if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) return;
        if (!Number.isInteger(filtrosPacientes.anio)) return;

        pendingSectionsRef.current.delete("pacientes");
        appliedFiltersRef.current.pacientes = { anio: filtrosPacientes.anio, mes };

        setFiltrosPacientes((current) => ({ ...current, mes }));
        cargarEstadisticasPacientes(filtrosPacientes.anio, mes, true);
    };

    const refreshFunctionsRef = useRef(null);
    refreshFunctionsRef.current = {
        resumen: () => cargarMetricasTarjetas(),
        citas: () => cargarEstadisticasCitas(
            appliedFiltersRef.current.citas.anio,
            appliedFiltersRef.current.citas.mes
        ),
        medicos: () => cargarEstadisticasMedicos(
            appliedFiltersRef.current.medicos.anio,
            appliedFiltersRef.current.medicos.mes
        ),
        pacientes: () => cargarEstadisticasPacientes(
            appliedFiltersRef.current.pacientes.anio,
            appliedFiltersRef.current.pacientes.mes
        ),
    };

    const scheduleRefreshRef = useRef(null);
    scheduleRefreshRef.current = (secciones) => {
        validDashboardSections(secciones).forEach((seccion) => {
            pendingSectionsRef.current.add(seccion);
        });
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
            const pendientes = [...pendingSectionsRef.current];
            pendingSectionsRef.current.clear();
            const { ready, deferred } = splitDashboardRefresh(pendientes, manualPendingRef.current);
            ready.forEach((seccion) => refreshFunctionsRef.current[seccion]());
            deferred.forEach((seccion) => pendingSectionsRef.current.add(seccion));
            if (pendingSectionsRef.current.size) scheduleRefreshRef.current([]);
        }, 500);
    };

    useEffect(() => {
        if (!eventoDashboard || seenEventsRef.current.has(eventoDashboard.event_id)) return;
        seenEventsRef.current.add(eventoDashboard.event_id);
        if (seenEventsRef.current.size > 100) seenEventsRef.current.clear();
        scheduleRefreshRef.current(eventoDashboard.secciones);
    }, [eventoDashboard]);

    useEffect(() => {
        if (versionConexion === 0) return;
        if (!initialConnectionRef.current) {
            initialConnectionRef.current = true;
            return;
        }
        scheduleRefreshRef.current(sectionsAfterConnection(versionConexion, initialConnectionRef.current));
    }, [versionConexion]);

    useEffect(() => {
        let midnightTimer;
        const programarMedianoche = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            midnightTimer = setTimeout(() => {
                dayRef.current = new Date().toDateString();
                scheduleRefreshRef.current(["resumen"]);
                programarMedianoche();
            }, tomorrow.getTime() - now.getTime() + 1000);
        };
        const actualizarAlVolver = () => {
            if (document.visibilityState !== "visible") return;
            const hoy = new Date().toDateString();
            if (hoy !== dayRef.current) {
                dayRef.current = hoy;
                scheduleRefreshRef.current(["resumen"]);
            }
        };
        document.addEventListener("visibilitychange", actualizarAlVolver);
        window.addEventListener("focus", actualizarAlVolver);
        programarMedianoche();
        return () => {
            clearTimeout(midnightTimer);
            document.removeEventListener("visibilitychange", actualizarAlVolver);
            window.removeEventListener("focus", actualizarAlVolver);
        };
    }, []);

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
