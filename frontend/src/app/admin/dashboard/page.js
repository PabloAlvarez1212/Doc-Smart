"use client"
import { CalendarDays, CircleUserRound, ClipboardClock, Stethoscope } from "lucide-react";
import AdminMetricCard from "../../../../components/admin/Dashboard/AdminMetricCard/AdminMetricCard";
import DashboardTabs from "../../../../components/admin/Dashboard/DashboardTabs/DashboardTabs";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import styles from "./dashboard.module.css";
import { useDashboard } from "../../../../components/admin/Dashboard/useDashboard";
import AppointmentStats from "../../../../components/admin/Dashboard/Appointments/AppointmentsStats/AppointmentsStats";
import { useState } from "react";
import DoctorStats from "../../../../components/admin/Dashboard/Doctors/DoctorStats/DoctorStats";

const metricDefinitions = [
    { key: "total_medicos_aprobados", label: "Total de médicos", icon: Stethoscope, tone: "blue" },
    { key: "total_pacientes", label: "Total de pacientes", icon: CircleUserRound, tone: "teal" },
    { key: "total_citas", label: "Total de citas", icon: CalendarDays, tone: "amber" },
    { key: "total_solicitudes_pendientes", label: "Solicitudes pendientes", icon: ClipboardClock, tone: "violet" },
];

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("resumen");
    const { metricasTarjetas, citasPorEstado, citasPorMes, citasPorEspecialidad, medicosPorEspecialidad, medicosPorEstadoValidacion, solicitudesValidacionPorMes } = useDashboard()
    return (
        <div className={styles.page}>
            <AdminPageHeader
                eyebrow="Vista general"
                title="Métricas del sistema"
                description="Resumen consolidado del estado general de DocSmart."
            />

            <section aria-labelledby="primary-metrics-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <span>Indicadores generales</span>
                        <h2 id="primary-metrics-title">Métricas principales</h2>
                    </div>
                </div>

                <div className={styles.metricsGrid}>
                    {metricDefinitions.map(({ key, ...metric }) => (
                        <AdminMetricCard
                            key={key}
                            {...metric}
                            value={metricasTarjetas?.[key]}
                            status={metricasTarjetas ? "available" : "loading"}
                        />
                    ))}
                </div>
            </section>

            <section className={styles.analyticsPanel} aria-labelledby="analytics-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <span>Análisis</span>
                        <h2 id="analytics-title">Información detallada sobre la actividad de DocSmart.</h2>
                    </div>
                </div>
                <DashboardTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                {activeTab === "citas" && (
                    <AppointmentStats
                        citasPorEstado={citasPorEstado}
                        citasPorMes={citasPorMes}
                        citasPorEspecialidad={citasPorEspecialidad}
                    />
                )}

                {activeTab === "medicos" && (
                    <DoctorStats
                        medicosPorEspecialidad={medicosPorEspecialidad}
                        medicosPorEstadoValidacion={medicosPorEstadoValidacion}
                        solicitudesValidacionPorMes={solicitudesValidacionPorMes}
                    />
                )}
            </section>
        </div>
    );
}
