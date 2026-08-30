"use client";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import {
    listarCitasMedicoService,
    cancelarCitaService,
    confirmarCitaService,
    completarCitaService,
    reprogramarCitaService,
} from "@/app/services/appointmentsServices";

export default function useAppointments() {

    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargarCitas = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await listarCitasMedicoService();

            setCitas(
                Array.isArray(data)
                    ? data
                    : data?.data ?? []
            );

        } catch (error) {

            const mensajeBackend = obtenerPrimerError(error.response?.data?.errores);
            setError(mensajeBackend || "No se pudieron cargar las citas.");

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarCitas();
    }, []);

    const cancelarCita = async (id_cita) => {

        const confirmacion = await Swal.fire({
            title: "¿Cancelar cita?",
            text: "La cita será cancelada.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, cancelar",
            cancelButtonText: "Volver",
        });

        if (!confirmacion.isConfirmed) {
            return;
        }

        try {

            await cancelarCitaService(id_cita);

            await cargarCitas();

            await Swal.fire({
                title: "Cita cancelada",
                text: "La cita fue cancelada correctamente.",
                icon: "success",
            });

        } catch (error) {

            console.error(
                "Error al cancelar cita:",
                error
            );

            Swal.fire({
                title: "Error",
                text: "No se pudo cancelar la cita.",
                icon: "error",
            });
        }
    };

    const confirmarCita = async (id_cita) => {

        try {

            await confirmarCitaService(id_cita);

            await cargarCitas();

            await Swal.fire({
                title: "Cita confirmada",
                text: "La cita fue confirmada correctamente.",
                icon: "success",
            });

        } catch (error) {

            console.error(
                "Error al confirmar cita:",
                error
            );

            Swal.fire({
                title: "Error",
                text: "No se pudo confirmar la cita.",
                icon: "error",
            });
        }
    };

    const completarCita = async (id_cita) => {

        const confirmacion = await Swal.fire({
            title: "¿Completar cita?",
            text: "La cita se marcará como completada.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, completar",
            cancelButtonText: "Cancelar",
        });

        if (!confirmacion.isConfirmed) {
            return;
        }

        try {

            await completarCitaService(id_cita);

            await cargarCitas();

            await Swal.fire({
                title: "Cita completada",
                text: "La cita fue marcada como completada.",
                icon: "success",
            });

        } catch (error) {

            console.error(
                "Error al completar cita:",
                error
            );

            Swal.fire({
                title: "Error",
                text: "No se pudo completar la cita.",
                icon: "error",
            });
        }
    };

    const reprogramarCita = async (
        id_cita,
        fecha_programada
    ) => {

        try {

            await reprogramarCitaService(
                id_cita,
                fecha_programada
            );

            await cargarCitas();

            await Swal.fire({
                title: "Cita reprogramada",
                text: "La cita fue reprogramada correctamente.",
                icon: "success",
            });

        } catch (error) {

            console.error(
                "Error al reprogramar cita:",
                error
            );

            Swal.fire({
                title: "Error",
                text:
                    error.response?.data?.mensaje ||
                    "No se pudo reprogramar la cita.",
                icon: "error",
            });
        }
    };

    return {
        citas,
        loading,
        error,
        cancelarCita,
        confirmarCita,
        completarCita,
        reprogramarCita,
        recargarCitas: cargarCitas,
    };
}

