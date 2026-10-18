"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerEstadisticasMedicoService } from "@/app/services/doctorServices";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import { crearFiltrosIniciales, obtenerRangoPeriodo } from "./dashboardPeriodFilters";

const EMPTY_DATA = {
    filtros: {},
    estadisticas: {},
    grafica_citas: [],
    grafica_estados: [],
    grafica_asistencia: [],
    grafica_demanda: [],
};

const normalizarLista = (value) => Array.isArray(value) ? value : [];

const normalizarDatos = (value) => {
    const source = value && typeof value === "object" ? value : {};
    return {
        filtros: source.filtros && typeof source.filtros === "object" ? source.filtros : {},
        estadisticas: source.estadisticas && typeof source.estadisticas === "object" ? source.estadisticas : {},
        grafica_citas: normalizarLista(source.grafica_citas),
        grafica_estados: normalizarLista(source.grafica_estados),
        grafica_asistencia: normalizarLista(source.grafica_asistencia),
        grafica_demanda: normalizarLista(source.grafica_demanda),
    };
};

export const useDashboardMedico = () => {
    const initialFiltersRef = useRef(crearFiltrosIniciales());
    const [datos, setDatos] = useState(null);
    const [filtros, setFiltros] = useState(initialFiltersRef.current);
    const [erroresFiltros, setErroresFiltros] = useState({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    const requestIdRef = useRef(0);
    const busyRef = useRef(false);
    const hasDataRef = useRef(false);
    const mountedRef = useRef(true);
    const appliedFiltersRef = useRef({ fecha_inicio: null, fecha_fin: null });

    const cargarDatos = useCallback(async (fechaInicio, fechaFin) => {
        if (busyRef.current) return false;

        busyRef.current = true;
        const requestId = ++requestIdRef.current;
        const isInitialLoad = !hasDataRef.current;

        if (isInitialLoad) setLoading(true);
        else setUpdating(true);
        setError(null);

        try {
            const respuesta = await obtenerEstadisticasMedicoService(fechaInicio, fechaFin);
            const payload = respuesta?.data;

            if (!payload || typeof payload !== "object") {
                throw new Error("INVALID_DASHBOARD_RESPONSE");
            }
            if (!mountedRef.current || requestId !== requestIdRef.current) return false;

            setDatos(normalizarDatos(payload));
            hasDataRef.current = true;
            return true;
        } catch (requestError) {
            if (!mountedRef.current || requestId !== requestIdRef.current) return false;

            const responseBody = requestError.response?.data;
            const message = obtenerPrimerError(responseBody?.errores)
                || obtenerPrimerError(responseBody?.mensaje)
                || "No pudimos cargar las estadísticas. Inténtalo nuevamente.";

            setError(message);
            if (!hasDataRef.current) setDatos(null);
            return false;
        } finally {
            if (mountedRef.current && requestId === requestIdRef.current) {
                setLoading(false);
                setUpdating(false);
                busyRef.current = false;
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        const initialRange = obtenerRangoPeriodo(initialFiltersRef.current);
        appliedFiltersRef.current = {
            fecha_inicio: initialRange.fecha_inicio,
            fecha_fin: initialRange.fecha_fin,
        };
        cargarDatos(initialRange.fecha_inicio, initialRange.fecha_fin);

        return () => {
            mountedRef.current = false;
            requestIdRef.current += 1;
            busyRef.current = false;
        };
    }, [cargarDatos]);

    const cambiarFiltro = useCallback((name, value) => {
        setFiltros((current) => ({ ...current, [name]: value }));
        setErroresFiltros((current) => ({ ...current, [name]: "" }));
    }, []);

    const aplicarFiltros = useCallback(async () => {
        const range = obtenerRangoPeriodo(filtros);
        setErroresFiltros(range.errores);
        if (Object.keys(range.errores).length > 0) return false;

        appliedFiltersRef.current = {
            fecha_inicio: range.fecha_inicio,
            fecha_fin: range.fecha_fin,
        };
        return cargarDatos(range.fecha_inicio, range.fecha_fin);
    }, [cargarDatos, filtros]);

    const restablecerFiltros = useCallback(async () => {
        const initialFilters = crearFiltrosIniciales();
        const range = obtenerRangoPeriodo(initialFilters);

        setFiltros(initialFilters);
        setErroresFiltros({});
        appliedFiltersRef.current = {
            fecha_inicio: range.fecha_inicio,
            fecha_fin: range.fecha_fin,
        };
        return cargarDatos(range.fecha_inicio, range.fecha_fin);
    }, [cargarDatos]);

    const retry = useCallback(() => {
        const { fecha_inicio, fecha_fin } = appliedFiltersRef.current;
        return cargarDatos(fecha_inicio, fecha_fin);
    }, [cargarDatos]);

    return {
        datos: datos ?? EMPTY_DATA,
        hasData: Boolean(datos),
        filtros,
        erroresFiltros,
        loading,
        updating,
        error,
        cambiarFiltro,
        aplicarFiltros,
        restablecerFiltros,
        retry,
    };
};

export default useDashboardMedico;
