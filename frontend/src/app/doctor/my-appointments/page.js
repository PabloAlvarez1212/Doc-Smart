"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import DoctorAppointmentList from "../../../../components/doctor/MyAppointments/AppointmentList/DoctorAppointmentList";
import FilterAppointments from "../../../../components/doctor/MyAppointments/FilterAppointments/FilterAppointments";
import HeaderAppointments from "../../../../components/doctor/MyAppointments/HeaderAppointments/HeaderAppointments";
import Hero from "../../../../components/doctor/MyAppointments/Hero/Hero";
import ReprogramAppointmentModal from "../../../../components/ui/ReprogramAppointmentModal/ReprogramAppointmentModal";
import useAppointments from "../../../../components/doctor/MyAppointments/useAppointments";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import {
    getAppointmentsResultKey,
    getAppointmentsResultMotion,
    hasActiveAppointmentFilters,
} from "../../../../components/ui/AppointmentCard/appointmentViewState";
import CompleteAppointmentModal from "../../../../components/ui/CompleteAppointmentModal/CompleteAppointmentModal";
import styles from "./myAppointments.module.css";

export default function MyAppointments() {
    const reduceMotion = useReducedMotion();
    const [citaSeleccionada, setCitaSeleccionada] = useState(null);
    const [modalReprogramar, setModalReprogramar] = useState(false);
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
        paginaActual,
        totalPaginas,
        totalRegistros,
        cambiarPagina,
        cancelarCita,
        confirmarCita,
        completarCita,
        reprogramarCita,
        recargarCitas,
    } = useAppointments();

    const hasActiveFilters = hasActiveAppointmentFilters(estado, { paciente, fecha });
    const resultKey = getAppointmentsResultKey(citas, totalRegistros);
    const resultMotion = getAppointmentsResultMotion(reduceMotion);

    const abrirReprogramacion = (cita) => {
        setCitaSeleccionada(cita);
        setModalReprogramar(true);
    };

    const cerrarReprogramacion = () => {
        setModalReprogramar(false);
    };

    const [modalCompletar, setModalCompletar] = useState(false);

    const abrirCierre = (cita) => {
        setCitaSeleccionada(cita);
        setModalCompletar(true);
    };


    const cerrarCierre = () => {
        setModalCompletar(false);
    };

    return (
        <main className={styles.page}>
            <Hero resumen={resumen} loading={loadingResumen} />

            <section className={styles.workspace} aria-label="Gestión de agenda médica">
                <HeaderAppointments estado={estado} cambiarEstado={cambiarEstado} resumen={resumen} />
                <FilterAppointments
                    paciente={paciente}
                    fecha={fecha}
                    cambiarPaciente={cambiarPaciente}
                    cambiarFecha={cambiarFecha}
                    limpiarFiltros={limpiarFiltros}
                />
            </section>

            <section className={styles.results} aria-labelledby="doctor-appointments-results-title" aria-busy={loading}>
                <div className={styles.resultsHeader}>
                    <div>
                        <h2 id="doctor-appointments-results-title">Agenda de consultas</h2>
                        <p aria-live="polite">
                            {loading && !citas.length
                                ? "Consultando tu agenda"
                                : `${totalRegistros} ${totalRegistros === 1 ? "cita encontrada" : "citas encontradas"}`}
                        </p>
                    </div>
                    {loading && citas.length > 0 && <span className={styles.updating} role="status">Actualizando</span>}
                </div>

                {error ? (
                    <div className={styles.errorState} role="alert">
                        <span aria-hidden="true"><AlertCircle size={24} /></span>
                        <div>
                            <h3>No pudimos cargar tu agenda</h3>
                            <p>Revisa tu conexión e inténtalo nuevamente.</p>
                        </div>
                        <button type="button" onClick={recargarCitas}>
                            <RefreshCw size={16} aria-hidden="true" /> Reintentar
                        </button>
                    </div>
                ) : loading && !citas.length ? (
                    <AppointmentSkeleton />
                ) : (
                    <m.div key={resultKey} {...resultMotion}>
                        <DoctorAppointmentList
                            citas={citas}
                            hasActiveFilters={hasActiveFilters}
                            cancelarCita={cancelarCita}
                            confirmarCita={confirmarCita}
                            completarCita={abrirCierre}
                            reprogramarCita={abrirReprogramacion}
                        />
                    </m.div>
                )}

                {!error && citas.length > 0 && (
                    <Pagination
                        paginaActual={paginaActual}
                        totalPaginas={totalPaginas}
                        totalRegistros={totalRegistros}
                        onCambiarPagina={cambiarPagina}
                        cargando={loading}
                        variant="appointments"
                    />
                )}
            </section>

            <ReprogramAppointmentModal
                abierto={modalReprogramar}
                onCerrar={cerrarReprogramacion}
                onExitComplete={() => setCitaSeleccionada(null)}
                cita={citaSeleccionada}
                reprogramarCita={reprogramarCita}
                counterpart="paciente"
            />

            <CompleteAppointmentModal
                abierto={modalCompletar}
                onCerrar={cerrarCierre}
                onExitComplete={() =>
                    setCitaSeleccionada(null)
                }
                cita={citaSeleccionada}
                completarCita={completarCita}
            />
        </main>
    );
}

function AppointmentSkeleton() {
    return (
        <div className={styles.skeletonList} role="status" aria-label="Cargando citas">
            {[0, 1, 2].map((item) => <span key={item} />)}
        </div>
    );
}
