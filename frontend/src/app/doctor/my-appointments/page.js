"use client";

import { useState } from "react";

import Hero from "../../../../components/doctor/MyAppointments/Hero/Hero";
import HeaderAppointments from "../../../../components/doctor/MyAppointments/HeaderAppointments/HeaderAppointments";
import FilterAppointments from "../../../../components/doctor/MyAppointments/FilterAppointments/FilterAppointments";
import AppointmentList from "../../../../components/patient/MyAppointments/AppointmentList/Appointment";
import useAppointments from "../../../../components/doctor/MyAppointments/useAppointments";
import ReprogramAppointment from "../../../../components/doctor/MyAppointments/ReprogramAppointmets/ReprogramAppointments";
import styles from "./myAppointments.module.css";


export default function MyAppointments() {

    // ==========================================
    // MODAL REPROGRAMAR
    // ==========================================

    const [
        citaSeleccionada,
        setCitaSeleccionada
    ] = useState(null);


    const [
        modalReprogramar,
        setModalReprogramar
    ] = useState(false);


    // ==========================================
    // HOOK CITAS
    // ==========================================

    const {

        citas,
        resumen,

        estado,
        paciente,
        fecha,

        cambiarEstado,
        cambiarPaciente,
        cambiarFecha,
        limpiarFiltros,

        loading,
        loadingResumen,
        error,

        cancelarCita,
        confirmarCita,
        completarCita,
        reprogramarCita,

    } = useAppointments();


    // ==========================================
    // ABRIR MODAL
    // ==========================================

    const abrirReprogramacion = (
        cita
    ) => {

        setCitaSeleccionada(
            cita
        );

        setModalReprogramar(
            true
        );

    };


    // ==========================================
    // CERRAR MODAL
    // ==========================================

    const cerrarReprogramacion = () => {

        setModalReprogramar(
            false
        );

        setCitaSeleccionada(
            null
        );

    };


    // ==========================================
    // RENDER
    // ==========================================

    return (

        <main className={styles.page}>

            {/* HERO */}

            <Hero
                resumen={resumen}
                loading={loadingResumen}
            />


            {/* ESTADOS */}

            <HeaderAppointments
                estado={estado}
                cambiarEstado={
                    cambiarEstado
                }
                resumen={resumen}
            />


            {/* FILTROS */}

            <FilterAppointments
                paciente={paciente}
                fecha={fecha}
                cambiarPaciente={
                    cambiarPaciente
                }
                cambiarFecha={
                    cambiarFecha
                }
                limpiarFiltros={
                    limpiarFiltros
                }
            />


            {/* ERROR */}

            {error && (

                <p>
                    {error}
                </p>

            )}


            {/* LOADING */}

            {!error && loading && (

                <p>
                    Cargando citas...
                </p>

            )}


            {/* LISTADO */}

            {!error && !loading && (

                <AppointmentList
                    citas={citas}
                    rol="medico"
                    cancelarCita={
                        cancelarCita
                    }
                    confirmarCita={
                        confirmarCita
                    }
                    completarCita={
                        completarCita
                    }
                    reprogramarCita={
                        abrirReprogramacion
                    }
                />

            )}


            {/* MODAL REPROGRAMAR */}

            {citaSeleccionada && (

                <ReprogramAppointment
                    abierto={
                        modalReprogramar
                    }
                    onCerrar={
                        cerrarReprogramacion
                    }
                    cita={
                        citaSeleccionada
                    }
                    reprogramarCita={
                        reprogramarCita
                    }
                />

            )}

        </main>

    );
}