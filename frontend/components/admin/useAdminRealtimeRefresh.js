"use client";

import { useEffect, useRef } from "react";
import { useNotificationsContext } from "../contex/NotificationsContext";

const REFRESH_DEBOUNCE_MS = 500;
const MAX_SEEN_EVENTS = 100;

/**
 * Ejecuta `onRefresh` cuando el servidor avisa por el WebSocket de notificaciones que
 * la sección cambió, y una vez tras reconectar. Agrupa ráfagas de eventos; mientras
 * `pausado` sea true guarda el refresco pendiente y lo ejecuta al volver a false.
 *
 * @param {string} seccion
 * @param {() => void} onRefresh
 * @param {{ pausado?: boolean }} [opciones]
 */
export default function useAdminRealtimeRefresh(seccion, onRefresh, { pausado = false } = {}) {
    const { eventoDashboard, versionConexion } = useNotificationsContext();
    const onRefreshRef = useRef(onRefresh);
    const pausadoRef = useRef(pausado);
    const pendienteRef = useRef(false);
    const timerRef = useRef(null);
    const seenEventsRef = useRef(null);
    const versionConexionRef = useRef(versionConexion);

    // Un evento que ya estaba en el contexto al montar no es una novedad.
    if (seenEventsRef.current === null) {
        seenEventsRef.current = new Set(eventoDashboard ? [eventoDashboard.event_id] : []);
    }

    const solicitarRef = useRef(null);
    solicitarRef.current = () => {
        pendienteRef.current = true;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (pausadoRef.current) return;
            pendienteRef.current = false;
            onRefreshRef.current();
        }, REFRESH_DEBOUNCE_MS);
    };

    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        pausadoRef.current = pausado;
        if (!pausado && pendienteRef.current) solicitarRef.current();
    }, [pausado]);

    useEffect(() => {
        if (!eventoDashboard || seenEventsRef.current.has(eventoDashboard.event_id)) return;
        seenEventsRef.current.add(eventoDashboard.event_id);
        if (seenEventsRef.current.size > MAX_SEEN_EVENTS) seenEventsRef.current.clear();
        if (eventoDashboard.secciones.includes(seccion)) solicitarRef.current();
    }, [eventoDashboard, seccion]);

    // La primera conexión carga los datos iniciales; solo las siguientes son reconexiones.
    useEffect(() => {
        const anterior = versionConexionRef.current;
        versionConexionRef.current = versionConexion;
        if (versionConexion === anterior || anterior === 0) return;
        solicitarRef.current();
    }, [versionConexion]);

    useEffect(() => () => clearTimeout(timerRef.current), []);
}
