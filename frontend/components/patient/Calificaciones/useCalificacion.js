"use client";

import { useRef, useState } from "react";
import {
    actualizarCalificacionService,
    actualizarVisibilidadCalificacionService,
    crearCalificacionService,
} from "@/app/services/calificacionServices";
import {
    createCalificacionSubmitter,
    createCalificacionVisibilitySubmitter,
    getCalificacionError,
    getVisibilidadCalificacionError,
} from "./calificacionOperations";

export default function useCalificacion() {
    const submitterRef = useRef(null);
    const busyRef = useRef(false);
    const visibilitySubmitterRef = useRef(null);
    const visibilityBusyRef = useRef(false);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const [actualizandoVisibilidad, setActualizandoVisibilidad] = useState(false);
    const [errorVisibilidad, setErrorVisibilidad] = useState("");

    if (!submitterRef.current) {
        submitterRef.current = createCalificacionSubmitter({
            crearService: crearCalificacionService,
            actualizarService: actualizarCalificacionService,
        });
    }

    if (!visibilitySubmitterRef.current) {
        visibilitySubmitterRef.current = createCalificacionVisibilitySubmitter({
            actualizarVisibilidadService: actualizarVisibilidadCalificacionService,
        });
    }

    const ejecutar = async (operation) => {
        if (busyRef.current) return { ignored: true };

        busyRef.current = true;
        setEnviando(true);
        setError("");

        try {
            return await operation();
        } catch (requestError) {
            setError(getCalificacionError(requestError));
            throw requestError;
        } finally {
            busyRef.current = false;
            setEnviando(false);
        }
    };

    const crearCalificacion = (data) => ejecutar(
        () => submitterRef.current.crear(data)
    );

    const actualizarCalificacion = (data) => ejecutar(
        () => submitterRef.current.actualizar(data)
    );

    const actualizarVisibilidad = async (data) => {
        if (visibilityBusyRef.current) return { ignored: true };
        visibilityBusyRef.current = true;
        setActualizandoVisibilidad(true);
        setErrorVisibilidad("");
        try {
            return await visibilitySubmitterRef.current.actualizar(data);
        } catch (requestError) {
            setErrorVisibilidad(getVisibilidadCalificacionError(requestError));
            throw requestError;
        } finally {
            visibilityBusyRef.current = false;
            setActualizandoVisibilidad(false);
        }
    };

    return {
        crearCalificacion,
        actualizarCalificacion,
        actualizarVisibilidad,
        enviando,
        error,
        actualizandoVisibilidad,
        errorVisibilidad,
        limpiarError: () => setError(""),
        limpiarErrorVisibilidad: () => setErrorVisibilidad(""),
    };
}
