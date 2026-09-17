"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerMiValidacionMedicoService } from "@/app/services/doctorServices";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";

export default function useDoctorValidation() {
    const [validacion, setValidacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const peticionActual = useRef(null);

    const cargarValidacion = useCallback(async () => {
        peticionActual.current?.abort();
        const controller = new AbortController();
        peticionActual.current = controller;
        try {
            setLoading(true);
            setError(null);

            const response =
                await obtenerMiValidacionMedicoService(controller.signal);

            if (!controller.signal.aborted) setValidacion(response.data ?? null);

        } catch (error) {
            if (controller.signal.aborted) return;
            setValidacion(null);
            console.error(
                "Error al obtener validación médica:",
                error
            );

            setError(
                (error.response?.status < 500 && obtenerPrimerError(error.response?.data?.errores))
                || "No fue posible cargar el estado de validación. Inténtalo de nuevo."
            );
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargarValidacion();
        return () => peticionActual.current?.abort();
    }, [cargarValidacion]);

    return {
        validacion,
        loading,
        error,
        recargarValidacion: cargarValidacion,
    };
}
