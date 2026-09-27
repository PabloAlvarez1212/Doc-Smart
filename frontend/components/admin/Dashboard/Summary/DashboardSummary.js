"use client";

import {
    CalendarCheck2,
    CalendarX2,
    CircleUserRound,
    ClipboardClock,
    Clock3,
    Stethoscope,
    UsersRound,
} from "lucide-react";
import AdminMetricCard from "../AdminMetricCard/AdminMetricCard";
import DashboardModuleState from "../DashboardModuleState/DashboardModuleState";
import RecentAppointmentsChart from "./RecentAppointmentsChart";
import styles from "./DashboardSummary.module.css";

/**
 * @typedef {Object} DashboardMetrics
 * @property {number} total_medicos_aprobados
 * @property {number} total_pacientes
 * @property {number} total_citas
 * @property {number} total_solicitudes_pendientes
 * @property {number} citas_hoy
 * @property {number} pacientes_activos_mes
 * @property {number|null} antiguedad_solicitud_pendiente_dias
 * @property {{mes: string, total: number}[]} citas_creadas_ultimos_3_meses
 * @property {{especialidad: string, total_citas: number}|null} especialidad_mayor_demanda_mes
 * @property {number} cancelaciones_mes
 */

const summaryMetrics = [
    {
        key: "citas_hoy",
        label: "Citas de hoy",
        supportingText: "Programadas para hoy",
        icon: CalendarCheck2,
        tone: "blue",
    },
    {
        key: "pacientes_activos_mes",
        label: "Pacientes activos este mes",
        supportingText: "Pacientes únicos con citas creadas",
        icon: UsersRound,
        tone: "teal",
    },
    {
        key: "total_medicos_aprobados",
        label: "Médicos aprobados",
        supportingText: "Disponibles actualmente en el sistema",
        icon: Stethoscope,
        tone: "blue",
    },
    {
        key: "total_solicitudes_pendientes",
        label: "Solicitudes pendientes",
        supportingText: "Pendientes de revisión administrativa",
        icon: ClipboardClock,
        tone: "violet",
    },
];

function safeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

/**
 * @param {{
 *   metrics: DashboardMetrics|null,
 *   loading?: boolean,
 *   error?: boolean
 * }} props
 */
export default function DashboardSummary({ metrics, loading = false, error = false }) {
    const metricStatus = loading ? "loading" : error ? "unavailable" : "available";
    const pendingRequests = safeCount(metrics?.total_solicitudes_pendientes);
    const cancellations = safeCount(metrics?.cancelaciones_mes);
    const oldestRequestDays = metrics?.antiguedad_solicitud_pendiente_dias;
    const recentActivity = Array.isArray(metrics?.citas_creadas_ultimos_3_meses)
        ? metrics.citas_creadas_ultimos_3_meses
        : [];
    const specialtyDemand = metrics?.especialidad_mayor_demanda_mes ?? null;

    return (
        <section className={styles.summary} aria-label="Resumen operativo del sistema">
            <div className={styles.metricsGrid}>
                {summaryMetrics.map(({ key, ...definition }) => (
                    <AdminMetricCard
                        key={key}
                        {...definition}
                        value={metrics?.[key]}
                        status={metricStatus}
                    />
                ))}
            </div>

            {loading ? (
                <div className={styles.loadingLayout} role="status" aria-label="Cargando resumen operativo">
                    <span className={styles.loadingChart} aria-hidden="true" />
                    <span className={styles.loadingPanel} aria-hidden="true" />
                </div>
            ) : error ? (
                <DashboardModuleState error moduleName="resumen" />
            ) : (
                <div className={styles.overviewGrid}>
                    <article className={styles.activityCard}>
                        <div className={styles.cardHeader}>
                            <div>
                                <span>Últimos meses disponibles</span>
                                <h3>Actividad reciente</h3>
                                <p>Citas creadas en los últimos 3 meses.</p>
                            </div>
                            <span className={styles.headerIcon} aria-hidden="true">
                                <CalendarCheck2 size={20} strokeWidth={1.9} />
                            </span>
                        </div>

                        {recentActivity.length ? (
                            <RecentAppointmentsChart data={recentActivity} />
                        ) : (
                            <p className={styles.emptyState}>Aún no hay actividad reciente para mostrar.</p>
                        )}
                    </article>

                    <div className={styles.sideColumn}>
                        <article className={styles.attentionCard}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <span>Seguimiento administrativo</span>
                                    <h3>Requiere atención</h3>
                                    <p>Indicadores que conviene revisar.</p>
                                </div>
                            </div>

                            <dl className={styles.attentionList}>
                                <div>
                                    <dt>
                                        <ClipboardClock size={17} aria-hidden="true" />
                                        Solicitudes pendientes
                                    </dt>
                                    <dd>{pendingRequests}</dd>
                                </div>
                                <div>
                                    <dt>
                                        <Clock3 size={17} aria-hidden="true" />
                                        Pendiente más antigua
                                    </dt>
                                    <dd>
                                        {oldestRequestDays === null || oldestRequestDays === undefined
                                            ? "Sin solicitudes pendientes"
                                            : `${safeCount(oldestRequestDays)} ${safeCount(oldestRequestDays) === 1 ? "día" : "días"}`}
                                    </dd>
                                </div>
                                <div>
                                    <dt>
                                        <CalendarX2 size={17} aria-hidden="true" />
                                        Cancelaciones este mes
                                    </dt>
                                    <dd>{cancellations}</dd>
                                </div>
                            </dl>
                        </article>

                        <article className={styles.demandCard}>
                            <div className={styles.demandIcon} aria-hidden="true">
                                <CircleUserRound size={22} strokeWidth={1.9} />
                            </div>
                            <div className={styles.demandContent}>
                                <span>Contexto del mes</span>
                                <h3>Especialidad con mayor demanda</h3>
                                {specialtyDemand ? (
                                    <div className={styles.demandMetric}>
                                        <strong>{specialtyDemand.especialidad}</strong>
                                        <p>
                                            {safeCount(specialtyDemand.total_citas)} {safeCount(specialtyDemand.total_citas) === 1 ? "cita" : "citas"} este mes
                                        </p>
                                    </div>
                                ) : (
                                    <p className={styles.demandEmpty}>Sin datos de demanda este mes.</p>
                                )}
                            </div>
                        </article>
                    </div>
                </div>
            )}
        </section>
    );
}
