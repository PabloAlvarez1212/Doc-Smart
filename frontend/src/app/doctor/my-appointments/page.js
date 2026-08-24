"use client";

import { useState } from "react";

import AppointmentList from "../../../../components/patient/MyAppointments/AppointmentList/Appointment";
import useAppointments from "../../../../components/doctor/MyAppointments/useAppointments";
import ReprogramAppointment from "../../../../components/doctor/MyAppointments/ReprogramAppointmets/ReprogramAppointments";

export default function MyAppointments() {

    const [citaSeleccionada, setCitaSeleccionada] =
        useState(null);

    const [modalReprogramar, setModalReprogramar] =
        useState(false);

    const {
        citas,
        loading,
        error,
        cancelarCita,
        confirmarCita,
        completarCita,
        reprogramarCita,
    } = useAppointments();

    const abrirReprogramacion = (cita) => {
        setCitaSeleccionada(cita);
        setModalReprogramar(true);
    };

    const cerrarReprogramacion = () => {
        setModalReprogramar(false);
        setCitaSeleccionada(null);
    };

    if (loading) {
        return <p>Cargando citas...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <div>

            <AppointmentList
                citas={citas}
                rol="medico"
                cancelarCita={cancelarCita}
                confirmarCita={confirmarCita}
                completarCita={completarCita}
                reprogramarCita={abrirReprogramacion}
            />

            {citaSeleccionada && (
                <ReprogramAppointment
                    abierto={modalReprogramar}
                    onCerrar={cerrarReprogramacion}
                    cita={citaSeleccionada}
                    reprogramarCita={reprogramarCita}
                />
            )}

        </div>
    );
}