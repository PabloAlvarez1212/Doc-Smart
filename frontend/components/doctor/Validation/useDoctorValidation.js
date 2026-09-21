"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
    obtenerMiValidacionMedicoService,
    reintentarSolicitudValidacionService,
} from "@/app/services/doctorServices";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";

const MAX_HOJA_VIDA_SIZE = 5 * 1024 * 1024;

function validarHojaVida(archivo) {
    if (!archivo) return "Selecciona una hoja de vida en PDF.";
    if (archivo.type !== "application/pdf") return "La hoja de vida debe estar en formato PDF.";
    if (archivo.size > MAX_HOJA_VIDA_SIZE) return "La hoja de vida no puede superar los 5 MB.";
    return null;
}

function obtenerMensajeBackend(error) {
    return (
        obtenerPrimerError(error.response?.data?.errores)
        || obtenerPrimerError(error.response?.data?.mensaje)
    );
}

export default function useDoctorValidation() {
    const [validacion, setValidacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState(null);
    const peticionActual = useRef(null);
    const envioActual = useRef(null);
    const envioEnCurso = useRef(false);

    const cargarValidacion = useCallback(async () => {
        peticionActual.current?.abort();
        const controller = new AbortController();
        peticionActual.current = controller;

        try {
            setLoading(true);
            setError(null);

            const response = await obtenerMiValidacionMedicoService(controller.signal);

            if (!controller.signal.aborted) setValidacion(response.data ?? null);
        } catch (requestError) {
            if (controller.signal.aborted) return;

            setValidacion(null);
            setError(
                (requestError.response?.status < 500 && obtenerMensajeBackend(requestError))
                || "No fue posible cargar el estado de validación. Inténtalo de nuevo."
            );
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, []);

    const enviarNuevaSolicitud = useCallback(async (archivo) => {
        if (envioEnCurso.current) return false;

        const errorValidacion = validarHojaVida(archivo);

        if (errorValidacion) {
            setErrorEnvio(errorValidacion);
            await Swal.fire({
                icon: "warning",
                title: "Revisa el archivo",
                text: errorValidacion,
                confirmButtonText: "Entendido",
            });
            return false;
        }

        const controller = new AbortController();
        envioActual.current = controller;
        envioEnCurso.current = true;
        setEnviandoSolicitud(true);
        setErrorEnvio(null);

        try {
            await reintentarSolicitudValidacionService(archivo, controller.signal);

            await Swal.fire({
                icon: "success",
                title: "Nueva solicitud enviada correctamente",
                text: "Tu nueva hoja de vida quedó pendiente de revisión.",
                confirmButtonText: "Continuar",
            });

            await cargarValidacion();
            return true;
        } catch (requestError) {
            if (controller.signal.aborted) return false;

            const mensaje = (
                obtenerMensajeBackend(requestError)
                || "No fue posible enviar la nueva solicitud. Inténtalo de nuevo."
            );

            setErrorEnvio(mensaje);
            await Swal.fire({
                icon: "error",
                title: "No pudimos enviar la solicitud",
                text: mensaje,
                confirmButtonText: "Entendido",
            });
            return false;
        } finally {
            if (envioActual.current === controller) {
                envioActual.current = null;
                envioEnCurso.current = false;
                if (!controller.signal.aborted) setEnviandoSolicitud(false);
            }
        }
    }, [cargarValidacion]);

    useEffect(() => {
        cargarValidacion();

        return () => {
            peticionActual.current?.abort();
            envioActual.current?.abort();
        };
    }, [cargarValidacion]);

    return {
        validacion,
        loading,
        error,
        recargarValidacion: cargarValidacion,
        enviarNuevaSolicitud,
        enviandoSolicitud,
        errorEnvio,
    };
}
