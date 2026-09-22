"use client";

import { useState } from "react";

import ExceptionModal from
    "../../../../components/doctor/Availability/ExceptionModal/ExceptionModal";

import AvailabilityHero from
    "../../../../components/doctor/Availability/Hero/AvailabilityHero";

import WeeklySchedule from
    "../../../../components/doctor/Availability/WeeklySchedule/WeeklySchedule";

import useAvailability from
    "../../../../components/doctor/Availability/useAvailability";

import Exceptions from
    "../../../../components/doctor/Availability/Exceptions/Exceptions";

import styles from "./availability.module.css";


export default function AvailabilityPage() {

    // Estado del modal
    const [modalAbierto, setModalAbierto] =
        useState(false);

    const [
        excepcionSeleccionada,
        setExcepcionSeleccionada
    ] = useState(null);


    // Hook de disponibilidad
    const {
        duracionConsulta,

        disponibilidad,

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

        recargar
    } = useAvailability();


    // Estado de carga inicial
    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.state}>
                    Cargando tu disponibilidad...
                </div>
            </div>
        );
    }


    // Crear nueva excepción
    const abrirModalNuevaExcepcion = () => {
        setExcepcionSeleccionada(null);
        setModalAbierto(true);
    };


    // Editar excepción existente
    const abrirModalEditarExcepcion =
        (excepcion) => {

            setExcepcionSeleccionada(
                excepcion
            );

            setModalAbierto(true);
        };


    // Cerrar modal
    const cerrarModal = () => {

        if (savingExcepcion) {
            return;
        }

        setModalAbierto(false);
        setExcepcionSeleccionada(null);
    };


    // Crear o actualizar excepción
    const guardarExcepcion =
        async (datos, esEdicion) => {

            let resultado;

            if (esEdicion) {

                resultado =
                    await actualizarExcepcion(
                        excepcionSeleccionada.fecha,
                        datos
                    );

            } else {

                resultado =
                    await crearExcepcion(
                        datos
                    );
            }


            if (!resultado.ok) {

                alert(
                    resultado.mensaje
                );

                return;
            }


            setModalAbierto(false);
            setExcepcionSeleccionada(null);
        };


    // Eliminar excepción
    const manejarEliminarExcepcion =
        async (fecha) => {

            const confirmar =
                window.confirm(
                    "¿Deseas eliminar esta excepción?"
                );

            if (!confirmar) {
                return;
            }


            const resultado =
                await eliminarExcepcion(
                    fecha
                );


            if (!resultado.ok) {

                alert(
                    resultado.mensaje
                );
            }
        };


    return (
        <div className={styles.page}>

            <AvailabilityHero
                duracionConsulta={
                    duracionConsulta
                }
            />


            {error && (
                <div className={styles.error}>

                    <div>
                        <strong>
                            Ocurrió un problema
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={recargar}
                    >
                        Reintentar
                    </button>

                </div>
            )}


            <WeeklySchedule
                disponibilidad={disponibilidad}
                duracionConsulta={duracionConsulta}
                saving={saving}
                onSave={guardarDisponibilidad}
            />


            <Exceptions
                excepciones={excepciones}
                loading={loadingExcepciones}
                onNueva={abrirModalNuevaExcepcion}
                onEditar={abrirModalEditarExcepcion}
                onEliminar={manejarEliminarExcepcion}
            />


            <ExceptionModal
                open={modalAbierto}
                excepcion={excepcionSeleccionada}
                saving={savingExcepcion}
                onClose={cerrarModal}
                onGuardar={guardarExcepcion}
            />

        </div>
    );
}