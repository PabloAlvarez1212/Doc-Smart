"use client";

import { useId, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, CalendarDays, Clock3, Check, CircleDot } from 'lucide-react';
import { summarizeToday, appointmentDate, filterToday } from './homeData.mjs';
import styles from './Home.module.css';

export function AppointmentStatus({ state }) {
  const tone = { confirmada: 'positive', completada: 'positive', pendiente: 'pending', cancelada: 'negative' }[state?.toLowerCase()] || 'neutral';
  return <span className={`${styles.badge} ${styles[tone]}`}>{state || 'Sin estado'}</span>;
}

export function TodaySummary({ appointments }) {
  const summary = summarizeToday(appointments);
  const fields = [['total', 'Citas hoy', CalendarDays], ['pendientes', 'Pendientes', Clock3], ['confirmadas', 'Confirmadas', CircleDot], ['completadas', 'Completadas', Check]];
  return (
    <div aria-label="Resumen de la jornada" className={styles.summary}>
      {fields.map(([key, label, Icon]) => (
        <div key={key}><Icon size={16} aria-hidden="true" /><strong>{summary[key]}</strong><span>{label}</span></div>
      ))}
    </div>
  );
}

export { default as NextAppointment } from './NextAppointment';

const filters = [['todas', 'Todas'], ['pendiente', 'Pendientes'], ['confirmada', 'Confirmadas'], ['completada', 'Completadas']];

export function TodaySchedule({ appointments = [] }) {
  const [filter, setFilter] = useState('todas');
  const reduced = useReducedMotion();
  const id = useId();
  const visible = filterToday(appointments, filter);
  return (
    <section className={`${styles.panel} ${styles.schedule}`} aria-labelledby="schedule-title">
      <div className={styles.sectionHeading}>
        <div><h2 id="schedule-title">Agenda de hoy</h2><p>Todo lo programado, en un solo lugar.</p></div>
        <Link className={styles.textLink} href="/doctor/my-appointments">Ver citas <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      <TodaySummary appointments={appointments} />
      <div className={styles.filters} role="group" aria-label="Filtrar agenda de hoy">
        {filters.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {filter === value && <motion.span className={styles.filterIndicator} layoutId={`agenda-filter-${id}`} transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }} aria-hidden="true" />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className={styles.srOnly} aria-live="polite">{visible.length} citas en el filtro {filters.find(([value]) => value === filter)[1]}.</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={filter} initial={reduced ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reduced ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.14 }}>
          {visible.length ? (
            <ol className={styles.agenda}>
              {visible.map(item => (
                <li key={item.id}>
                  <time dateTime={item.fecha_programada}>{appointmentDate(item.fecha_programada, true)}</time>
                  <div className={styles.agendaPatient}><h3>{item.paciente}</h3><span>Consulta programada</span></div>
                  <AppointmentStatus state={item.estado} />
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}><CalendarDays size={28} aria-hidden="true" /><div><h3>{appointments.length ? 'Sin citas en este estado' : 'Hoy no tienes citas'}</h3><p>{appointments.length ? 'Elige otro filtro para consultar el resto de tu jornada.' : 'Puedes revisar los próximos días en Mis citas.'}</p></div></div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
