"use client";

import Link from 'next/link';
import { Users, CalendarDays, ClipboardList, Bell } from 'lucide-react';
import { useDashboardMedico } from '../../../../components/doctor/Home/useDashboardMedico';
import styles from './dashboard.module.css';
const metrics = [['pacientes_totales', 'Pacientes con citas', Users], ['citas_hoy', 'Citas de hoy', CalendarDays], ['notificaciones_no_leidas', 'Notificaciones sin leer', Bell], ['diagnosticos', 'Registros clínicos', ClipboardList]];
export default function Dashboard() {
  const {
    dashboard,
    loading,
    error,
    retry
  } = useDashboardMedico();
  if (loading) return <p className="data-state" role="status">Cargando estadísticas…</p>;
  if (error) return <div className="data-state" role="status"><p>{error}</p><button onClick={retry} type="button">Volver a intentar</button></div>;
  return <section className={styles.page}><h1>Tu práctica, en perspectiva.</h1><p>Estadísticas de tu cuenta y actividad registrada en DocSmart.</p><div className={styles.metrics}>{metrics.map(([key, label, Icon]) => <article key={key}><Icon size={24} aria-hidden="true" /><strong>{new Intl.NumberFormat('es-CO').format(dashboard.estadisticas[key] ?? 0)}</strong><span>{label}</span></article>)}</div><div className={styles.activity}><h2>Agenda de hoy</h2>{dashboard.citas_hoy?.length ? <ul>{dashboard.citas_hoy.map(cita => <li key={cita.id}><span>{cita.paciente}</span><time dateTime={cita.fecha_programada}>{new Intl.DateTimeFormat('es-CO', {
              timeStyle: 'short',
              timeZone: 'America/Bogota'
            }).format(new Date(cita.fecha_programada))}</time><span>{cita.estado}</span></li>)}</ul> : <p>No hay citas programadas para hoy.</p>}<Link href="/doctor/my-appointments">Consultar mis citas</Link></div><div className={styles.notifications}><Bell size={20} /><p>{dashboard.estadisticas.notificaciones_no_leidas ?? 0} notificaciones sin leer.</p><Link href="/doctor/notifications">Ver notificaciones</Link></div></section>;
}
