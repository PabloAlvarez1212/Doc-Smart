"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import AppointmentList from "../../../../components/patient/MyAppointments/AppointmentList/Appointment";
import FilterAppointment from "../../../../components/patient/MyAppointments/FilterAppointment/FilterAppointment";
import HeaderAppointment from "../../../../components/patient/MyAppointments/HeaderAppointment/HeaderAppointment";
import Hero from "../../../../components/patient/MyAppointments/Hero/Hero";
import {
    getAppointmentsResultKey,
    getAppointmentsResultMotion,
    hasActiveAppointmentFilters,
} from "../../../../components/patient/MyAppointments/appointmentsViewState";
import useAppointments from "../../../../components/patient/MyAppointments/useAppointments";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import styles from "./myAppointments.module.css";

export default function MyAppointments() {
    const reduceMotion = useReducedMotion();
    const {
        citas,
        especialidades,
        departamentos,
        ciudades,
        cancelarCita,
        cambiarFiltro,
        filtros,
        estado,
        cambiarEstado,
        loading,
        cambiarPagina,
        paginaActual,
        totalPaginas,
        totalRegistros,
        error,
        recargarCitas,
    } = useAppointments();
    const hasActiveFilters = hasActiveAppointmentFilters(estado, filtros);
    const resultKey = getAppointmentsResultKey(citas, totalRegistros);
    const resultMotion = getAppointmentsResultMotion(reduceMotion);

    return (
        <div className={styles.page}>
            <Hero />

            <section className={styles.workspace} aria-label="Gestión de citas">
                <HeaderAppointment estado={estado} cambiarEstado={cambiarEstado} />
                <FilterAppointment
                    dataEspecialidades={especialidades}
                    cambiarFiltro={cambiarFiltro}
                    filtros={filtros}
                    dataDepartamentos={departamentos}
                    dataCiudades={ciudades}
                />
            </section>

            <section className={styles.results} aria-labelledby="appointments-results-title" aria-busy={loading}>
                <div className={styles.resultsHeader}>
                    <div>
                        <h2 id="appointments-results-title">Tus citas</h2>
                        <p aria-live="polite">
                            {loading && !citas.length
                                ? "Consultando tu agenda"
                                : `${totalRegistros} ${totalRegistros === 1 ? "cita encontrada" : "citas encontradas"}`}
                        </p>
                    </div>
                    {loading && citas.length > 0 && (
                        <span className={styles.updating} role="status">Actualizando</span>
                    )}
                </div>

                {error ? (
                    <div className={styles.errorState} role="alert">
                        <span aria-hidden="true"><AlertCircle size={24} /></span>
                        <div>
                            <h3>No pudimos cargar tus citas</h3>
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
                        <AppointmentList
                            citas={citas}
                            cancelarCita={cancelarCita}
                            hasActiveFilters={hasActiveFilters}
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
                        variant="patient"
                    />
                )}
            </section>
        </div>
    );
}

function AppointmentSkeleton() {
    return (
        <div className={styles.skeletonList} role="status" aria-label="Cargando citas">
            {[0, 1, 2].map((item) => <span key={item} />)}
        </div>
    );
}
