"use client";

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { summarizeToday, appointmentDate, filterToday, agendaTime, nextToday, timeUntil } from './homeData.mjs';
import RollingNumber from '../../ui/Motion/RollingNumber';
import styles from './Home.module.css';

const spring = { type: 'spring', bounce: 0.22, visualDuration: 0.38 };

export function AppointmentStatus({ state }) {
  const tone = { confirmada: 'positive', completada: 'positive', pendiente: 'pending', cancelada: 'negative', rechazada: 'negative' }[state?.toLowerCase()] || 'neutral';
  return <span className={`${styles.badge} ${styles[tone]}`}>{state || 'Sin estado'}</span>;
}

export function TodaySummary({ appointments }) {
  const summary = summarizeToday(appointments);
  const fields = [['total', 'Citas hoy', 'total'], ['pendientes', 'Pendientes', 'pendiente'], ['confirmadas', 'Confirmadas', 'confirmada'], ['completadas', 'Completadas', 'completada']];
  return (
    <div aria-label="Resumen de la jornada" className={styles.summary}>
      {fields.map(([key, label, tone]) => (
        <div key={key}>
          <RollingNumber className={styles.summaryValue} value={summary[key]} />
          <span><i data-tone={tone} aria-hidden="true" />{label}</span>
        </div>
      ))}
    </div>
  );
}

export { default as NextAppointment } from './NextAppointment';

const filters = [['todas', 'Todas'], ['pendiente', 'Pendientes'], ['confirmada', 'Confirmadas'], ['completada', 'Completadas']];

// Hora actual que se renueva cada 30 s para mover la marca de "ahora".
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function TodaySchedule({ appointments = [] }) {
  const [filter, setFilter] = useState('todas');
  const reduced = useReducedMotion();
  const id = useId();
  const now = useNow();
  const visible = filterToday(appointments, filter);
  const ordered = filterToday(appointments);
  const next = nextToday(appointments, now);
  const range = ordered.length ? `De ${appointmentDate(ordered[0].fecha_programada, true)} a ${appointmentDate(ordered.at(-1).fecha_programada, true)}` : 'Todo lo programado, en un solo lugar.';
  const firstAhead = visible.findIndex(item => new Date(item.fecha_programada).getTime() > now);
  const nowIndex = filter === 'todas' && visible.length ? (firstAhead === -1 ? visible.length : firstAhead) : -1;
  const nowTime = agendaTime(now);

  const rows = visible.map((item, index) => ({ item, index }));
  if (nowIndex >= 0) rows.splice(nowIndex, 0, { now: true });

  return (
    <section className={`${styles.panel} ${styles.schedule}`} aria-labelledby="schedule-title">
      <div className={styles.sectionHeading}>
        <div><h2 id="schedule-title">Agenda de hoy</h2><p>{range}</p></div>
        <Link className={styles.textLink} href="/doctor/my-appointments">Ver citas <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      <TodaySummary appointments={appointments} />
      <div className={styles.filters} role="group" aria-label="Filtrar agenda de hoy">
        {filters.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {filter === value && <motion.span className={styles.filterIndicator} layoutId={`agenda-filter-${id}`} transition={reduced ? { duration: 0 } : spring} aria-hidden="true" />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className={styles.srOnly} aria-live="polite">{visible.length} citas en el filtro {filters.find(([value]) => value === filter)[1]}.</p>
      <div className={styles.agendaViewport} tabIndex={0} role="region" aria-label="Citas de la agenda de hoy">
        <AnimatePresence mode="popLayout" initial={!reduced}>
          {visible.length ? (
            <motion.ol key="agenda" className={styles.agenda} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }}>
              <AnimatePresence mode="popLayout" initial={!reduced}>
                {rows.map(row => row.now ? (
                  <motion.li
                    key="now"
                    layout={reduced ? false : 'position'}
                    className={styles.now}
                    aria-hidden="true"
                    initial={{ opacity: 0, scaleX: 0.6 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0 }}
                    transition={spring}
                  >
                    <span>{nowTime.hora}</span><i /><hr />
                  </motion.li>
                ) : (
                  <AgendaRow key={row.item.id} item={row.item} index={row.index} isNext={row.item.id === next?.id} now={now} reduced={reduced} />
                ))}
              </AnimatePresence>
            </motion.ol>
          ) : (
            <motion.div key="empty" className={styles.agendaEmpty} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={reduced ? { duration: 0 } : spring}>
              {!appointments.length && <div className={styles.now} aria-hidden="true"><span>{nowTime.hora}</span><i /><hr /></div>}
              <span className={styles.emptyIcon} aria-hidden="true"><CalendarDays size={24} /></span>
              <h3>{appointments.length ? 'Sin citas en este estado' : 'Hoy no tienes citas'}</h3>
              <p>{appointments.length ? 'Elige otro filtro para ver el resto de tu jornada.' : 'Cuando un paciente agende para hoy, aparecerá aquí en orden de hora.'}</p>
              {!appointments.length && <Link className={styles.emptyLink} href="/doctor/my-appointments">Ver próximos días <ArrowUpRight size={16} aria-hidden="true" /></Link>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

const rowNote = { pendiente: 'Por confirmar', completada: 'Consulta atendida', cancelada: 'Cita cancelada', rechazada: 'Solicitud rechazada' };

// AnimatePresence en modo popLayout necesita el ref de la fila para medirla al salir.
function AgendaRow({ ref, item, index, isNext, now, reduced }) {
  const { hora, periodo } = agendaTime(item.fecha_programada);
  return (
    <motion.li
      ref={ref}
      layout={reduced ? false : 'position'}
      className={isNext ? styles.isNext : undefined}
      data-state={item.estado?.toLowerCase()}
      initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ ...spring, delay: Math.min(index, 7) * 0.04 }}
    >
      <time dateTime={item.fecha_programada}>{hora}<small>{periodo}</small></time>
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.agendaPatient}>
        <h3>{item.paciente}</h3>
        <span>{isNext ? `Siguiente · ${timeUntil(item.fecha_programada, now)}` : rowNote[item.estado?.toLowerCase()] || 'Consulta programada'}</span>
      </div>
      <AppointmentStatus state={item.estado} />
    </motion.li>
  );
}
