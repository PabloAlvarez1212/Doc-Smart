"use client";

import DashboardModuleState from "../DashboardModuleState/DashboardModuleState";
import MonthPanel from "./MonthPanel";
import NowTile from "./NowTile";
import RecentAppointmentsChart from "./RecentAppointmentsChart";
import {
    buildPendingRequests,
    buildPendingVerifications,
    buildTodayAppointments,
    formatCount,
} from "./summaryRegistryData";
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
 * @property {{especialidad: string|null, total_citas: number}|null} especialidad_mas_solicitada_mes
 * @property {{especialidad: string|null, total_citas: number}|null} especialidad_mas_programada_mes
 * @property {number} cancelaciones_mes
 * @property {{canceladas: number, base: number, tasa: number|null}} tasa_cancelacion_mes
 * @property {{promedio: number|null, total: number}} calificacion_promedio_mes
 */

const EMPTY = "—";

const PENDING_TILE = {
    ok: { tone: "ok", pill: "Al día" },
    alert: { tone: "alert", pill: "Requiere revisión" },
    unknown: { tone: "info", pill: undefined },
};

const VERIFICATION_TILE = {
    alert: { tone: "alert", pill: "Por confirmar" },
    neutral: { tone: "neutral", pill: undefined },
    unknown: { tone: "info", pill: undefined },
};

const metricDefinitions = [
    ["Cita válida", "no está cancelada ni vencida."],
    ["Citas de hoy", "citas válidas programadas para hoy."],
    [
        "Verificaciones por confirmar",
        "pacientes que el sistema dejó pasar y que un administrador aún debe confirmar.",
    ],
    [
        "Pacientes activos",
        "pacientes únicos con al menos una cita válida este mes, sobre los registrados sin cuentas bloqueadas.",
    ],
    [
        "Canceladas (C de B)",
        "citas programadas este mes que están canceladas, sobre todas las programadas del mes.",
    ],
    ["Canceladas durante el mes", "cancelaciones hechas este mes, sin importar la fecha de la cita."],
    ["Calificación promedio", "promedio de las calificaciones recibidas este mes."],
    [
        "Comparación con el mes anterior",
        "se compara del día 1 a hoy contra el mismo tramo del mes anterior (si ese mes tiene menos días, hasta su último día). Las citas y los pacientes activos varían en %; las tasas de cancelación e inasistencia, en puntos porcentuales (de 10 % a 12 % son +2,0 pts, no +20 %); la calificación, en puntos de calificación. La variación de citas se calcula con citas válidas, aunque la fila muestre todas las programadas del mes.",
    ],
    [
        "Base mínima",
        "si el tramo anterior tiene menos de 5 citas (cancelación, inasistencia) o menos de 5 calificaciones, o la cifra anterior es 0, se muestra «sin comparación» para no exagerar variaciones.",
    ],
    [
        "Inasistencias",
        "citas válidas del tramo que ya ocurrieron y quedaron como inasistencia del paciente, sobre todas las válidas que ya ocurrieron.",
    ],
    [
        "Pacientes bloqueados",
        "se excluyen según su estado de hoy, sin historial: el mes anterior se calcula con ese mismo criterio.",
    ],
    ["Especialidad más solicitada", "la que más citas recibió al crearse este mes."],
    ["Especialidad más programada", "la que más citas tiene con fecha de atención este mes."],
];

/**
 * @param {{
 *   metrics: DashboardMetrics|null,
 *   loading?: boolean,
 *   error?: boolean
 * }} props
 */
export default function DashboardSummary({ metrics, loading = false, error = false }) {
    if (error && !loading) {
        return (
            <section className={styles.summary} aria-label="Resumen operativo del sistema">
                <DashboardModuleState error moduleName="resumen" />
            </section>
        );
    }

    const hasMetrics = Boolean(metrics);
    const today = buildTodayAppointments(metrics);
    const pending = buildPendingRequests(metrics);
    const pendingTile = PENDING_TILE[pending.status];
    const verifications = buildPendingVerifications(metrics);
    const verificationTile = VERIFICATION_TILE[verifications.status];
    const recentActivity = Array.isArray(metrics?.citas_creadas_ultimos_3_meses)
        ? metrics.citas_creadas_ultimos_3_meses
        : [];
    const count = (value) => (hasMetrics ? formatCount(value) : EMPTY);
    const totals = [
        ["Médicos aprobados", count(metrics?.total_medicos_aprobados)],
        ["Pacientes registrados", count(metrics?.total_pacientes)],
        ["Citas válidas", count(metrics?.total_citas)],
    ];

    return (
        <section
            className={styles.summary}
            aria-label="Resumen operativo del sistema"
            aria-busy={loading}
        >
            <div className={styles.grid}>
                <div className={styles.leftColumn}>
                    <section className={styles.now} aria-labelledby="resumen-ahora">
                        <h3 id="resumen-ahora" className={styles.panelTitle}>Ahora</h3>
                        <div className={styles.nowTiles}>
                            <NowTile
                                label="Citas de hoy"
                                value={today.value}
                                context={today.context}
                                tone="info"
                                loading={loading}
                            />
                            <NowTile
                                label="Solicitudes pendientes"
                                value={pending.value}
                                tone={pendingTile.tone}
                                pill={pendingTile.pill}
                                context={pending.context}
                                loading={loading}
                                href="/admin/doctor-requests?estado=pendiente"
                                linkLabel="Ir a las solicitudes médicas pendientes"
                            />
                            <NowTile
                                label="Verificaciones por confirmar"
                                value={verifications.value}
                                tone={verificationTile.tone}
                                pill={verificationTile.pill}
                                loading={loading}
                                href="/admin/patient-verification?estado=posterior"
                                linkLabel="Ir a las verificaciones de pacientes por confirmar"
                            />
                        </div>
                    </section>

                    <section className={`${styles.panel} ${styles.chartPanel}`} aria-labelledby="resumen-citas-por-mes">
                        <h3 id="resumen-citas-por-mes" className={styles.panelTitle}>Citas creadas por mes</h3>
                        <p className={styles.panelSubtitle}>Se cuentan al crearse, no por su fecha de atención.</p>
                        {loading ? (
                            <span className={styles.chartSkeleton} role="status" aria-label="Cargando gráfico" />
                        ) : (
                            <RecentAppointmentsChart data={recentActivity} />
                        )}
                    </section>

                    <section className={`${styles.panel} ${styles.totalsPanel}`} aria-labelledby="resumen-totales">
                        <h3 id="resumen-totales" className={styles.panelTitle}>Totales</h3>
                        <dl className={styles.totals}>
                            {totals.map(([label, value]) => (
                                <div key={label} className={styles.totalStat}>
                                    <dt>{label}</dt>
                                    <dd className={value === EMPTY ? styles.totalEmpty : ""}>
                                        {loading ? <span className={styles.skeleton} aria-hidden="true" /> : value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </div>

                <MonthPanel metrics={metrics} loading={loading} />
            </div>

            <details className={styles.definitions}>
                <summary>Cómo se calcula cada métrica</summary>
                <ul>
                    {metricDefinitions.map(([term, definition]) => (
                        <li key={term}>
                            <strong>{term}:</strong> {definition}
                        </li>
                    ))}
                </ul>
            </details>
        </section>
    );
}
