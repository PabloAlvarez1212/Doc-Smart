"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/app/services/api";
import AppointmentDetailsModal from "../AppointmentDetailsModal/AppointmentDetailsModal";
import { appointmentLinkError, matchesAppointmentTarget, positiveAppointmentId } from "./appointmentTarget";
import styles from "./AppointmentDeepLink.module.css";

export default function AppointmentDeepLink(props) {
    return <Suspense fallback={null}><AppointmentTarget {...props} /></Suspense>;
}

function AppointmentTarget({ counterpart = "medico" }) {
    const params = useSearchParams();
    const query = params.toString();
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState(null);
    const [closedQuery, setClosedQuery] = useState(null);
    useEffect(() => {
        setClosedQuery(null);
        const values = new URLSearchParams(query);
        if (!values.has("cita") && !values.has("historial")) return;
        const id = positiveAppointmentId(values.get("cita"));
        const historyId = values.has("historial") ? positiveAppointmentId(values.get("historial")) : null;
        if (!id || values.getAll("cita").length !== 1 ||
            (values.has("historial") && (!historyId || counterpart !== "paciente" || values.getAll("historial").length !== 1))) {
            setResult({ query, error: "El enlace de la cita no es válido. Consulta tu agenda para encontrarla." });
            return;
        }
        const controller = new AbortController();
        setResult({ query, loading: true });
        api.get(`/citas/${id}/`, { signal: controller.signal }).then(({ data }) => {
            if (controller.signal.aborted) return;
            const appointment = data?.data;
            if (!matchesAppointmentTarget(appointment, id, historyId)) {
                setResult({ query, error: "El registro solicitado no está disponible para esta cita. Consulta tu agenda." });
                return;
            }
            setResult({ query, appointment, history: historyId !== null });
        }).catch((error) => {
            if (!controller.signal.aborted) setResult({ query, error: appointmentLinkError(error.response?.status), retry: ![401,403,404].includes(error.response?.status) });
        });
        return () => controller.abort();
    }, [query, counterpart, attempt]);

    if (!result || result.query !== query) return null;
    return <>
        {closedQuery !== query && (result.loading || result.error) && <div className={styles.notice} role={result.error ? "alert" : "status"}>
            <p>{result.loading ? "Abriendo la cita de tu notificación…" : result.error}</p>
            {result.retry && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>}
            {result.error && <button type="button" onClick={() => setClosedQuery(query)}>Cerrar aviso</button>}
        </div>}
        <AppointmentDetailsModal abierto={Boolean(result.appointment) && closedQuery !== query} cita={result.appointment || null}
            counterpart={counterpart} mostrarHistorialClinico={result.history}
            onCerrar={() => setClosedQuery(query)} />
    </>;
}

