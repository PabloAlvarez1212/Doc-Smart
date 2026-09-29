"use client";

import { useState } from "react";
import AppointmentStats from "../../../../components/admin/Dashboard/Appointments/AppointmentsStats/AppointmentsStats";
import DashboardTabs from "../../../../components/admin/Dashboard/DashboardTabs/DashboardTabs";
import DoctorStats from "../../../../components/admin/Dashboard/Doctors/DoctorStats/DoctorStats";
import PatientStats from "../../../../components/admin/Dashboard/Patients/PatientStats/PatientStats";
import DashboardSummary from "../../../../components/admin/Dashboard/Summary/DashboardSummary";
import { useDashboard } from "../../../../components/admin/Dashboard/useDashboard";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import styles from "./dashboard.module.css";

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("resumen");
    const {
        metricasTarjetas,
        loadingMetricas,
        errorMetricas,
        citasPorEstado,
        citasCreadasPorPeriodo,
        filtrosCitas,
        cambiarAnioCitas,
        cambiarMesCitas,
        citasPorEspecialidad,
        citasPorDiaSemana,
        citasPorHora,
        loadingCitas,
        errorCitas,
        medicosPorEspecialidad,
        medicosPorEstadoValidacion,
        solicitudesValidacionPorPeriodo,
        filtrosMedicos,
        cambiarAnioMedicos,
        cambiarMesMedicos,
        medicosQueMasAtienden,
        tiempoPromedioValidacion,
        loadingMedicos,
        errorMedicos,
        pacientesPorEdad,
        pacientesPorMes,
        pacientesPorCantidadCitas,
        pacientesActivosPorMes,
        loadingPacientes,
        errorPacientes,
    } = useDashboard();

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <AdminPageHeader
                    eyebrow="Vista general"
                    title="Dashboard administrativo"
                    description="Resumen consolidado del estado general de DocSmart."
                />
            </div>

            <section className={styles.analyticsPanel} aria-labelledby="analytics-title">
                <DashboardTabs activeTab={activeTab} setActiveTab={setActiveTab} />

                {activeTab === "resumen" && (
                    <DashboardSummary
                        metrics={metricasTarjetas}
                        loading={loadingMetricas}
                        error={errorMetricas}
                    />
                )}

                {activeTab === "citas" && (
                    <AppointmentStats
                        citasPorEstado={citasPorEstado}
                        citasCreadasPorPeriodo={citasCreadasPorPeriodo}
                        filtros={filtrosCitas}
                        cambiarAnio={cambiarAnioCitas}
                        cambiarMes={cambiarMesCitas}
                        citasPorEspecialidad={citasPorEspecialidad}
                        citasPorDiaSemana={citasPorDiaSemana}
                        citasPorHora={citasPorHora}
                        loading={loadingCitas}
                        error={errorCitas}
                    />
                )}

                {activeTab === "medicos" && (
                    <DoctorStats
                        medicosPorEspecialidad={medicosPorEspecialidad}
                        medicosPorEstadoValidacion={medicosPorEstadoValidacion}
                        solicitudesValidacionPorPeriodo={solicitudesValidacionPorPeriodo}
                        filtros={filtrosMedicos}
                        cambiarAnio={cambiarAnioMedicos}
                        cambiarMes={cambiarMesMedicos}
                        medicosQueMasAtienden={medicosQueMasAtienden}
                        tiempoPromedioValidacion={tiempoPromedioValidacion}
                        loading={loadingMedicos}
                        error={errorMedicos}
                    />
                )}

                {activeTab === "pacientes" && (
                    <PatientStats
                        pacientesPorEdad={pacientesPorEdad}
                        pacientesPorMes={pacientesPorMes}
                        pacientesPorCantidadCitas={pacientesPorCantidadCitas}
                        pacientesActivosPorMes={pacientesActivosPorMes}
                        loading={loadingPacientes}
                        error={errorPacientes}
                    />
                )}
            </section>
        </div>
    );
}
