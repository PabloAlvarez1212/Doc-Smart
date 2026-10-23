"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    listarCalificacionesMedicoService,
    listarMisCalificacionesMedicoService,
    obtenerPromedioCalificacionesMedicoService,
} from "@/app/services/calificacionServices";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import {
    normalizeCalificacionesResponse,
    normalizeResumenCalificaciones,
} from "../patient/Calificaciones/medicoCalificacionesModel";

function getRequestError(error) {
    return obtenerPrimerError(error?.response?.data?.errores)
        || obtenerPrimerError(error?.response?.data?.mensaje)
        || "No pudimos cargar las valoraciones. Inténtalo nuevamente.";
}

export default function useCalificacionesMedico(idMedico, {
    incluirResenas = false,
    resenasPrivadas = false,
    activo = true,
} = {}) {
    const [resumen, setResumen] = useState(null);
    const [calificaciones, setCalificaciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const requestId = useRef(0);

    const cargar = useCallback(async () => {
        if (!activo || !idMedico) return;

        const currentRequest = ++requestId.current;
        setLoading(true);
        setError(null);

        try {
            const [promedioResponse, calificacionesResponse] = await Promise.all([
                obtenerPromedioCalificacionesMedicoService(idMedico),
                incluirResenas
                    ? (resenasPrivadas
                        ? listarMisCalificacionesMedicoService()
                        : listarCalificacionesMedicoService(idMedico))
                    : Promise.resolve(null),
            ]);

            if (currentRequest !== requestId.current) return;
            setResumen(normalizeResumenCalificaciones(promedioResponse?.data));
            setCalificaciones(
                incluirResenas
                    ? normalizeCalificacionesResponse(calificacionesResponse?.data)
                    : [],
            );
        } catch (requestError) {
            if (currentRequest !== requestId.current) return;
            setResumen(null);
            setCalificaciones([]);
            setError(getRequestError(requestError));
        } finally {
            if (currentRequest === requestId.current) setLoading(false);
        }
    }, [activo, idMedico, incluirResenas, resenasPrivadas]);

    useEffect(() => {
        if (!activo || !idMedico) {
            requestId.current += 1;
            setResumen(null);
            setCalificaciones([]);
            setError(null);
            setLoading(false);
            return;
        }

        cargar();
        return () => {
            requestId.current += 1;
        };
    }, [activo, idMedico, incluirResenas, resenasPrivadas, cargar]);

    return { resumen, calificaciones, loading, error, retry: cargar };
}
