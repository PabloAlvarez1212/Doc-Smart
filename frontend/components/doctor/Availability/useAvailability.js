"use client";

import {
    useCallback,
    useEffect,
    useState
} from "react";

import {
    obtenerDisponibilidadMedicoService,
    actualizarDisponibilidadMedicoService,
    obtenerExcepcionesDisponibilidadService,
    crearExcepcionDisponibilidadService,
    actualizarExcepcionDisponibilidadService,
    eliminarExcepcionDisponibilidadService
} from "@/app/services/doctorServices";


export default function useAvailability() {

    const [duracionConsulta, setDuracionConsulta] =
        useState(30);

    const [disponibilidad, setDisponibilidad] =
        useState([]);

    const [excepciones, setExcepciones] =
        useState([]);

    const [loadingExcepciones, setLoadingExcepciones] =
        useState(true);

    const [savingExcepcion, setSavingExcepcion] =
        useState(false);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState(null);

    const cargarDisponibilidad =
        useCallback(async () => {

            try {
                setLoading(true);
                setError(null);

                const response =
                    await obtenerDisponibilidadMedicoService();

                const data = response?.data;

                setDuracionConsulta(
                    data?.duracion_consulta ?? 30
                );

                setDisponibilidad(
                    data?.disponibilidad ?? []
                );

            } catch (error) {

                console.error(
                    "Error cargando disponibilidad:",
                    error
                );

                setError(
                    "No fue posible cargar tu disponibilidad."
                );

            } finally {
                setLoading(false);
            }

        }, []);



    const cargarExcepciones =
        useCallback(async () => {

            try {
                setLoadingExcepciones(true);
                setError(null);

                const response =
                    await obtenerExcepcionesDisponibilidadService();

                const data = response?.data ?? [];

                setExcepciones(data);

            } catch (error) {

                console.error(
                    "Error cargando excepciones:",
                    error
                );

                setError(
                    "No fue posible cargar las excepciones."
                );

            } finally {
                setLoadingExcepciones(false);
            }

        }, []);


    useEffect(() => {
        cargarDisponibilidad();
        cargarExcepciones();
    }, [
        cargarDisponibilidad,
        cargarExcepciones
    ]);



    const guardarDisponibilidad =
        async (datos) => {

            try {
                setSaving(true);
                setError(null);

                const response =
                    await actualizarDisponibilidadMedicoService(
                        datos
                    );

                const data = response?.data;

                setDuracionConsulta(
                    data?.duracion_consulta
                    ?? datos.duracion_consulta
                );

                setDisponibilidad(
                    data?.disponibilidad
                    ?? datos.disponibilidad
                );

                return {
                    ok: true,
                    mensaje:
                        response?.mensaje
                        ?? "Disponibilidad actualizada correctamente"
                };

            } catch (error) {

                console.error(
                    "Error guardando disponibilidad:",
                    error
                );

                const mensaje =
                    error?.response?.data?.errores?.detalle
                    || error?.response?.data?.mensaje
                    || "No fue posible guardar los cambios.";

                setError(mensaje);

                return {
                    ok: false,
                    mensaje
                };

            } finally {
                setSaving(false);
            }
        };

    const crearExcepcion =
    async (datos) => {

        try {
            setSavingExcepcion(true);
            setError(null);

            const response =
                await crearExcepcionDisponibilidadService(
                    datos
                );

            await cargarExcepciones();

            return {
                ok: true,
                mensaje:
                    response?.mensaje
                    ?? "Excepción creada correctamente"
            };

        } catch (error) {

            console.error(
                "Error creando excepción:",
                error
            );

            const mensaje =
                error?.response?.data?.mensaje
                || "No fue posible crear la excepción.";

            setError(mensaje);

            return {
                ok: false,
                mensaje
            };

        } finally {
            setSavingExcepcion(false);
        }
    };


const actualizarExcepcion =
    async (fecha, datos) => {

        try {
            setSavingExcepcion(true);
            setError(null);

            const response =
                await actualizarExcepcionDisponibilidadService(
                    fecha,
                    datos
                );

            await cargarExcepciones();

            return {
                ok: true,
                mensaje:
                    response?.mensaje
                    ?? "Excepción actualizada correctamente"
            };

        } catch (error) {

            console.error(
                "Error actualizando excepción:",
                error
            );

            const mensaje =
                error?.response?.data?.mensaje
                || "No fue posible actualizar la excepción.";

            setError(mensaje);

            return {
                ok: false,
                mensaje
            };

        } finally {
            setSavingExcepcion(false);
        }
    };


const eliminarExcepcion =
    async (fecha) => {

        try {
            setSavingExcepcion(true);
            setError(null);

            await eliminarExcepcionDisponibilidadService(
                fecha
            );

            await cargarExcepciones();

            return {
                ok: true,
                mensaje:
                    "Excepción eliminada correctamente"
            };

        } catch (error) {

            console.error(
                "Error eliminando excepción:",
                error
            );

            const mensaje =
                error?.response?.data?.mensaje
                || "No fue posible eliminar la excepción.";

            setError(mensaje);

            return {
                ok: false,
                mensaje
            };

        } finally {
            setSavingExcepcion(false);
        }
    };


    return {
        duracionConsulta,
        setDuracionConsulta,

        disponibilidad,
        setDisponibilidad,

        excepciones,

        loading,
        loadingExcepciones,

        saving,
        savingExcepcion,

        error,

        guardarDisponibilidad,

        crearExcepcion,
        actualizarExcepcion,
        eliminarExcepcion,

        recargar: cargarDisponibilidad,
        recargarExcepciones: cargarExcepciones
    };
}