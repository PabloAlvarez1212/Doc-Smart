"use client";

import '../../../../components/doctor/Home/home-theme.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Hero from '../../../../components/doctor/Home/Hero/Hero';
import Notifications from '../../../../components/doctor/Home/Notifications/Notifications';
import { NextAppointment, TodaySchedule } from '../../../../components/doctor/Home/DayOverview';
import QuickActions from '../../../../components/doctor/Home/QuickActions';
import { HomeReveal } from '../../../../components/doctor/Home/homeMotion';
import { useDashboardMedico } from '../../../../components/doctor/Home/useDashboardMedico';
import { nextAppointment } from '../../../../components/doctor/Home/homeData.mjs';
import { useNotificationsContext } from '../../../../components/contex/NotificationsContext';
import styles from '../../../../components/doctor/Home/Home.module.css';
import useCalificacionesMedico from '../../../../components/hooks/useCalificacionesMedico';
import RatingSummary from '../../../../components/ui/MedicalRatings/RatingSummary/RatingSummary';

export default function Home() {
  const homeRef = useRef(null);
  const { dashboard, loading, error, retry } = useDashboardMedico();
  const ratings = useCalificacionesMedico(dashboard?.id, { activo: Boolean(dashboard?.id) });
  const [date, setDate] = useState('');
  const notifications = useNotificationsContext();

  useLayoutEffect(() => {
    if (loading || error) return;
    const schedule = homeRef.current?.querySelector('[aria-labelledby="schedule-title"]');
    const inbox = homeRef.current?.querySelector('[aria-labelledby="notifications-title"]');
    if (!schedule || !inbox) return;
    // Cap the agenda at its neighbour's actual height without stretching short days.
    const measure = () => schedule.style.setProperty('--agenda-max-height', `${inbox.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inbox);
    return () => observer.disconnect();
  }, [loading, error]);

  useEffect(() => {
    const update = () => setDate(new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={homeRef} className={styles.home} data-doctor-home="true">
      {loading ? (
        <div role="status" aria-label="Cargando tu inicio" className={styles.skeleton}>
          <span className={styles.skeletonHeading} aria-hidden="true" />
          <div className={styles.skeletonGrid} aria-hidden="true"><span /><span /><span /><span /></div>
          <p>Cargando tu jornada…</p>
        </div>
      ) : error ? (
        <section className={`${styles.panel} ${styles.error}`} role="alert">
          <AlertCircle size={28} aria-hidden="true" /><h1>No pudimos cargar tu jornada</h1><p>{error}</p>
          <button type="button" className={styles.primary} onClick={retry}><RefreshCw size={16} aria-hidden="true" />Volver a intentar</button>
        </section>
      ) : (
        <>
          <Hero nombre={dashboard?.usuario} especialidad={dashboard?.especialidad} foto_perfil={dashboard?.foto_perfil} date={date} noLeidas={notifications.noLeidas} />
          <HomeReveal className={styles.primaryGrid}>
            <NextAppointment appointment={nextAppointment(dashboard?.proximas_citas)} />
            <div className={styles.homeSidebar}>
              <QuickActions />
              <RatingSummary compact variant="home" resumen={ratings.resumen} loading={ratings.loading} error={ratings.error} onRetry={ratings.retry} />
            </div>
          </HomeReveal>
          <HomeReveal className={styles.secondaryGrid} delay={0.06}>
            <TodaySchedule appointments={dashboard?.citas_hoy} />
            <Notifications
              data={dashboard}
              notifications={notifications.notificaciones}
              unread={notifications.noLeidas}
              loading={notifications.loading}
              error={notifications.error}
              onRead={notifications.marcarLeida}
              onRetry={notifications.cargarNotificaciones}
            />
          </HomeReveal>
        </>
      )}
    </div>
  );
}
