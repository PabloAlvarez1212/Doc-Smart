"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNotificationsContext } from "../contex/NotificationsContext";

const REFRESH_DEBOUNCE_MS = 500;
const MAX_SEEN_EVENTS = 100;

/**
 * Ejecuta `onRefresh` cuando el servidor avisa por el WebSocket de notificaciones que
 * la sección cambió, y una vez tras reconectar. Procesa todos los eventos nuevos de la
 * cola del contexto, agrupa ráfagas en un solo refresco y, mientras `pausado` sea true,
 * guarda el refresco pendiente y lo ejecuta al volver a false.
 *
 * @param {string} seccion
 * @param {() => void} onRefresh
 * @param {{ pausado?: boolean }} [opciones]
 */
export default function useAdminRealtimeRefresh(seccion, onRefresh, { pausado = false } = {}) {
    const { eventosDashboard, versionConexion } = useNotificationsContext();
    // Los eventos que ya estaban en la cola al montar no son novedades.
    const [secuenciaInicial] = useState(() => eventosDashboard.at(-1)?.secuencia ?? 0);
    const ultimaSecuenciaRef = useRef(secuenciaInicial);
    const versionConexionRef = useRef(versionConexion);
    const seenEventsRef = useRef(new Set());
    const onRefreshRef = useRef(onRefresh);
    const pausadoRef = useRef(pausado);
    const pendienteRef = useRef(false);
    const timerRef = useRef(null);

    const solicitar = useCallback(() => {
        pendienteRef.current = true;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (pausadoRef.current) return;
            pendienteRef.current = false;
            onRefreshRef.current();
        }, REFRESH_DEBOUNCE_MS);
    }, []);

    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        pausadoRef.current = pausado;
        if (!pausado && pendienteRef.current) solicitar();
    }, [pausado, solicitar]);

    useEffect(() => {
        const nuevos = eventosDashboard.filter((evento) => evento.secuencia > ultimaSecuenciaRef.current);
        if (!nuevos.length) return;

        ultimaSecuenciaRef.current = nuevos[nuevos.length - 1].secuencia;
        let relevante = false;
        nuevos.forEach((evento) => {
            if (seenEventsRef.current.has(evento.event_id)) return;
            seenEventsRef.current.add(evento.event_id);
            if (seenEventsRef.current.size > MAX_SEEN_EVENTS) seenEventsRef.current.clear();
            if (evento.secciones.includes(seccion)) relevante = true;
        });
        if (relevante) solicitar();
    }, [eventosDashboard, seccion, solicitar]);

    // La primera conexión carga los datos iniciales; solo las siguientes son reconexiones.
    useEffect(() => {
        const anterior = versionConexionRef.current;
        versionConexionRef.current = versionConexion;
        if (versionConexion === anterior || anterior === 0) return;
        solicitar();
    }, [versionConexion, solicitar]);

    useEffect(() => () => clearTimeout(timerRef.current), []);
}
