"use client";

import { Users, CalendarDays, ClipboardList, Bell } from 'lucide-react';
import styles from './StaticCards.module.css';
const fields = [['pacientes_totales', 'Pacientes con citas', Users], ['citas_hoy', 'Citas de hoy', CalendarDays], ['diagnosticos', 'Registros clínicos', ClipboardList], ['notificaciones_no_leidas', 'Notificaciones sin leer', Bell]];
export default function StaticCards({
  dashboard
}) {
  return <div className={styles.containerMain}><div className={styles.containerCards}>{fields.map(([key, label, Icon]) => <article key={key} className={styles.metric}><Icon size={24} aria-hidden="true" /><strong>{new Intl.NumberFormat('es-CO').format(dashboard.estadisticas[key] ?? 0)}</strong><span>{label}</span></article>)}</div></div>;
}
