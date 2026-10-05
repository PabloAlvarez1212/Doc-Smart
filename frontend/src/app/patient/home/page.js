"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { domAnimation, LazyMotion, m, MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import AppointmentsList from "../../../../components/patient/Home/AppointmentsList/AppointmentsList";
import Hero from "../../../../components/patient/Home/Hero/Hero";
import Notifications from "../../../../components/patient/Home/Notifications/Notifications";
import { updateUpcomingAppointmentsCount } from "../../../../components/patient/Home/patientHomeData";
import { getPageReveal } from "../../../../components/patient/Home/patientHomeMotion";
import QuickActions from "../../../../components/patient/Home/QuickActions/QuickActions";
import StaticCards from "../../../../components/patient/Home/StaticCards/StaticCards";
import { useDashboardPaciente } from "../../../../components/patient/Home/useDashboardPaciente";
import { useNotificationsContext } from "../../../../components/contex/NotificationsContext";
import styles from "./home.module.css";

export default function Home() {
    const reduceMotion = useReducedMotion();
    const { dashboard, loading, error, retry } = useDashboardPaciente();
    const {
        notificaciones,
        noLeidas,
        marcarLeida,
        eventoCita,
        loading: notificationsLoading,
        error: notificationsError,
        cargarNotificaciones,
    } = useNotificationsContext();
    const [citas, setCitas] = useState([]);
    const [proximas, setProximas] = useState(0);
    const [pendientes, setPendientes] = useState(0);
    const [realizadas, setRealizadas] = useState(0);
    const [canceladas, setCanceladas] = useState(0);

    useEffect(() => {
        if (!dashboard) return;

        setCitas(dashboard.proximas_citas || []);
        setProximas(
            dashboard.estadisticas?.cantidad_proximas_citas
            ?? dashboard.proximas_citas?.length
            ?? 0
        );
        setPendientes(dashboard.estadisticas?.consultas_pendientes || 0);
        setRealizadas(dashboard.estadisticas?.consultas_realizadas_mes || 0);
        setCanceladas(dashboard.estadisticas?.consultas_canceladas_mes || 0);
    }, [dashboard]);

    useEffect(() => {
        if (!eventoCita?.cita) return;

        const { tipo_evento, cita } = eventoCita;
        const estado = cita.estado?.toUpperCase();

        setProximas((current) => updateUpcomingAppointmentsCount(current, tipo_evento));
        setCitas((currentAppointments) => {
            if (estado !== "CONFIRMADA") {
                return currentAppointments.filter((current) => current.id !== cita.id);
            }

            const exists = currentAppointments.some((current) => current.id === cita.id);
            return exists
                ? currentAppointments.map((current) => current.id === cita.id ? cita : current)
                : [cita, ...currentAppointments];
        });

        if (tipo_evento === "NUEVA_SOLICITUD" || estado === "PENDIENTE") {
            setPendientes((current) => current + 1);
        }
        if (tipo_evento === "CITA_CONFIRMADA" || estado === "CONFIRMADA") {
            setPendientes((current) => Math.max(0, current - 1));
        }
        if (tipo_evento === "CITA_COMPLETADA" || estado === "COMPLETADA" || estado === "REALIZADA") {
            setRealizadas((current) => current + 1);
        }
        if (tipo_evento === "CITA_CANCELADA" || estado === "CANCELADA" || estado === "RECHAZADA") {
            setPendientes((current) => Math.max(0, current - 1));
            setCanceladas((current) => current + 1);
        }
    }, [eventoCita]);

    if (loading) return <HomeLoading />;

    if (error || !dashboard) {
        return (
            <div className={styles.page}>
                <div className={styles.errorState} role="alert">
                    <span aria-hidden="true"><AlertCircle size={25} /></span>
                    <div>
                        <h1>No pudimos cargar tu inicio</h1>
                        <p>{error || "La información no está disponible en este momento."}</p>
                    </div>
                    <button type="button" onClick={retry}>
                        <RefreshCw size={16} aria-hidden="true" /> Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <MotionConfig reducedMotion="user">
            <LazyMotion features={domAnimation}>
                <m.div className={styles.page} {...getPageReveal(reduceMotion)}>
                    <p className={styles.liveRegion} aria-live="polite">
                        {eventoCita?.cita ? "La información de tus citas se actualizó." : ""}
                    </p>

                    <Hero
                        nombre={dashboard.usuario}
                        noLeidas={noLeidas}
                        foto_perfil={dashboard.foto_perfil}
                    />

                    <div className={styles.primaryGrid}>
                        <AppointmentsList appointments={citas} />
                        <QuickActions />
                    </div>

                    <div className={styles.secondaryGrid}>
                        <Notifications
                            notifications={notificaciones}
                            loading={notificationsLoading}
                            error={notificationsError}
                            onMarcarLeida={marcarLeida}
                            onRetry={cargarNotificaciones}
                        />
                        <StaticCards
                            dashboard={dashboard}
                            cantidadProximasCitas={proximas}
                            consultasPendientes={pendientes}
                            consultasRealizadas={realizadas}
                            consultasCanceladas={canceladas}
                        />
                    </div>
                </m.div>
            </LazyMotion>
        </MotionConfig>
    );
}

function HomeLoading() {
    return (
        <div className={styles.page} role="status" aria-label="Cargando inicio del paciente">
            <span className={`${styles.skeleton} ${styles.skeletonHero}`} aria-hidden="true" />
            <div className={styles.primaryGrid} aria-hidden="true">
                <span className={`${styles.skeleton} ${styles.skeletonAppointment}`} />
                <span className={`${styles.skeleton} ${styles.skeletonActions}`} />
            </div>
            <div className={styles.secondaryGrid} aria-hidden="true">
                <span className={`${styles.skeleton} ${styles.skeletonNotifications}`} />
                <span className={`${styles.skeleton} ${styles.skeletonSummary}`} />
            </div>
        </div>
    );
}
