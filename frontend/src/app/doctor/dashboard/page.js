"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import EstadisticasCards from "../../../../components/doctor/Dashboard/EstadisticasCards/EstadisticasCards";
import FiltrosDashboard from "../../../../components/doctor/Dashboard/FiltrosDashboard/FiltrosDashboard";
import GraficaAsistencia from "../../../../components/doctor/Dashboard/GraficaAsistencia/GraficaAsistencia";
import GraficaDemanda from "../../../../components/doctor/Dashboard/GraficaDemanda/GraficaDemanda";
import GraficaEstados from "../../../../components/doctor/Dashboard/GraficaEstados/GraficaEstados";
import GraficaEvolucion from "../../../../components/doctor/Dashboard/GraficaEvolucion/GraficaEvolucion";
import useDashboardMedico from "../../../../components/doctor/Dashboard/useDashboardMedico";
import styles from "./dashboard.module.css";

function DashboardSkeleton() {
    return (
        <div className={styles.skeletonLayout} aria-label="Cargando estadísticas del dashboard" role="status">
            <div className={styles.skeletonFilters} />
            <div className={styles.skeletonMetrics}>
                {Array.from({ length: 4 }, (_, index) => (
                    <div className={styles.skeletonMetric} key={index} />
                ))}
            </div>
            <div className={styles.skeletonCharts}>
                {Array.from({ length: 4 }, (_, index) => (
                    <div className={styles.skeletonChart} key={index} />
                ))}
            </div>
            <span className={styles.srOnly}>Cargando estadísticas…</span>
        </div>
    );
}

export default function Dashboard() {
    const {
        datos,
        hasData,
        filtros,
        erroresFiltros,
        loading,
        updating,
        error,
        cambiarFiltro,
        aplicarFiltros,
        restablecerFiltros,
        retry,
    } = useDashboardMedico();

    const initialError = Boolean(error && !hasData);

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <header className={styles.pageHeader}>
                    <div>
                        <h1>Dashboard médico</h1>
                        <p className={styles.introduction}>
                            Consulta el comportamiento de tus citas y la asistencia de tus pacientes.
                        </p>
                    </div>
                    <span className={styles.contextLabel}>Estadísticas de atención</span>
                </header>

                {loading ? (
                    <DashboardSkeleton />
                ) : initialError ? (
                    <section className={styles.errorState} role="alert">
                        <span className={styles.errorIcon} aria-hidden="true">
                            <CircleAlert size={23} />
                        </span>
                        <div>
                            <h2>No pudimos cargar tu dashboard</h2>
                            <p>{error}</p>
                        </div>
                        <button type="button" onClick={retry}>
                            <RefreshCw size={16} aria-hidden="true" />
                            Reintentar
                        </button>
                    </section>
                ) : (
                    <div className={styles.dashboardContent} aria-busy={updating}>
                        <FiltrosDashboard
                            filtros={filtros}
                            errores={erroresFiltros}
                            updating={updating}
                            onChange={cambiarFiltro}
                            onApply={aplicarFiltros}
                            onReset={restablecerFiltros}
                        />

                        {error && (
                            <div className={styles.inlineError} role="alert">
                                <CircleAlert size={18} aria-hidden="true" />
                                <span>{error}</span>
                                <button type="button" onClick={retry}>Reintentar</button>
                            </div>
                        )}

                        {updating && (
                            <p className={styles.updateNotice} role="status" aria-live="polite">
                                Actualizando el período sin ocultar los resultados actuales…
                            </p>
                        )}

                        <EstadisticasCards estadisticas={datos.estadisticas} />

                        <section className={styles.chartGrid} aria-label="Gráficas del dashboard médico">
                            <GraficaEvolucion data={datos.grafica_citas} agrupacion={datos.filtros?.agrupacion} />
                            <GraficaEstados data={datos.grafica_estados} />
                            <GraficaAsistencia data={datos.grafica_asistencia} />
                            <GraficaDemanda data={datos.grafica_demanda} />
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
