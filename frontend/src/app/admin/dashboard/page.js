import { CalendarDays, CircleUserRound, ClipboardClock, Stethoscope } from "lucide-react";
import AdminMetricCard from "../../../../components/admin/Dashboard/AdminMetricCard";
import DashboardMetricsState from "../../../../components/admin/Dashboard/DashboardMetricsState";
import AdminPageHeader from "../../../../components/admin/PageHeader/AdminPageHeader";
import styles from "./dashboard.module.css";

const metricDefinitions = [
    { key: "doctors", label: "Total de médicos", icon: Stethoscope, tone: "blue" },
    { key: "patients", label: "Total de pacientes", icon: CircleUserRound, tone: "teal" },
    { key: "appointments", label: "Total de citas", icon: CalendarDays, tone: "amber" },
    { key: "pendingRequests", label: "Solicitudes pendientes", icon: ClipboardClock, tone: "violet" },
];

export default function Dashboard() {
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
                    <span className={styles.developmentBadge}>Módulo en desarrollo</span>
                </div>

                <div className={styles.metricsGrid}>
                    {metricDefinitions.map(({ key, ...metric }) => (
                        <AdminMetricCard key={key} {...metric} status="unavailable" />
                    ))}
                </div>
            </section>

            <section className={styles.analyticsPanel} aria-labelledby="analytics-title">
                <div className={styles.sectionHeading}>
                    <div>
                        <span>Análisis</span>
                        <h2 id="analytics-title">Tendencias y distribución</h2>
                    </div>
                </div>
                <DashboardMetricsState />
            </section>
        </div>
    );
}
