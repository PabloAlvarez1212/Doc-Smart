"use client";

import { UsersRound, ClipboardList } from 'lucide-react';
import RecentNotifications from '../../../ui/Notifications/RecentNotifications';
import RollingNumber from '../../../ui/Motion/RollingNumber';
import styles from './Notifications.module.css';

export default function Notifications({ data, notifications = [], unread = 0, loading, error, onRead, onRetry }) {
  return (
    <RecentNotifications
      role="doctor"
      titleId="notifications-title"
      title="Notificaciones recientes"
      description="Solicitudes, mensajes y novedades de tu agenda."
      href="/doctor/notifications"
      notifications={notifications}
      unread={unread}
      loading={loading}
      error={error}
      withTitle
      onRead={onRead}
      onRetry={onRetry}
    >
      <div className={styles.activity}>
        <h3>Actividad acumulada</h3>
        <div><span aria-hidden="true"><UsersRound size={17} /></span>Pacientes con citas<RollingNumber className={styles.value} value={data?.estadisticas?.pacientes_totales ?? 0} /></div>
        <div><span aria-hidden="true"><ClipboardList size={17} /></span>Registros clínicos<RollingNumber className={styles.value} value={data?.estadisticas?.diagnosticos ?? 0} /></div>
      </div>
    </RecentNotifications>
  );
}
