"use client";

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Bell, ArrowRight, UsersRound, ClipboardList, Check, LoaderCircle, RefreshCw, Inbox } from 'lucide-react';
import { formatearFechaRelativa } from '@/app/utils/fechaFormaterUtils';
import { renderIcono } from '@/app/utils/estadoDise/estadoDiseUtils';
import { getContentTransition } from '../../../patient/Home/patientHomeMotion';
import shared from '../../../patient/Home/Notifications/Notifications.module.css';
import styles from './Notifications.module.css';
import home from '../Home.module.css';
import NotificationContent from '../../../ui/Notifications/NotificationContent';

export default function Notifications({ data, notifications = [], unread = 0, loading, error, onRead, onRetry }) {
  const reduced = useReducedMotion();
  const [pending, setPending] = useState({});
  const [announcement, setAnnouncement] = useState('');
  const recent = notifications.slice(0, 3);

  async function markRead(item) {
    setPending(current => ({ ...current, [item.id]: true }));
    setAnnouncement('Marcando notificación como leída.');
    try {
      const success = await onRead(item.id);
      setAnnouncement(success ? 'Notificación marcada como leída.' : 'No se pudo marcar como leída. Puedes reintentar.');
    } finally {
      setPending(current => ({ ...current, [item.id]: false }));
    }
  }

  return (
    <section className={`${shared.section} ${styles.doctor}`} aria-labelledby="notifications-title">
      <div className={shared.header}>
        <div><h2 id="notifications-title">Notificaciones recientes</h2><p>{unread} {unread === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}</p></div>
        <Link href="/doctor/notifications">Ver todas <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <p className={home.srOnly} aria-live="polite">{announcement}</p>
      {loading ? (
        <div className={shared.loading} role="status" aria-label="Cargando notificaciones"><span /><span /><span /></div>
      ) : error ? (
        <div className={shared.feedback} role="alert"><RefreshCw size={23} aria-hidden="true" /><div><strong>No pudimos cargar las notificaciones</strong><p>{error}</p></div><button type="button" onClick={onRetry}>Reintentar</button></div>
      ) : recent.length ? (
        <motion.div className={shared.list} layout={!reduced}>
          <AnimatePresence initial={false}>
            {recent.map(item => (
              <motion.article key={item.id} layout={!reduced} {...getContentTransition(reduced)} className={`${shared.item} ${styles.item} ${item.leida ? '' : styles.unread}`}>
                <span className={`${shared.itemIcon} ${styles.itemIcon}`} aria-hidden="true">{renderIcono(item.tipo, 20) || <Bell size={20} />}</span>
                <NotificationContent notification={item} role="doctor" markRead={onRead} className={`${shared.itemCopy} ${styles.itemCopy}`} />
                {item.leida ? <span className={styles.readLabel}><Check size={14} aria-hidden="true" />Vista</span> : (
                  <button className={`${shared.readButton} ${styles.readButton}`} type="button" disabled={pending[item.id]} aria-busy={Boolean(pending[item.id])} title={pending[item.id] ? 'Marcando…' : 'Marcar como leída'} aria-label={`Marcar como leída: ${item.mensaje}`} onClick={() => markRead(item)}>
                    {pending[item.id] ? <LoaderCircle size={15} className={styles.spinner} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                    <span className={styles.readActionText}>{pending[item.id] ? 'Marcando…' : 'Marcar leída'}</span>
                  </button>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : <div className={shared.feedback}><Inbox size={24} aria-hidden="true" /><div><strong>Todo está al día</strong><p>No hay notificaciones recientes.</p></div></div>}
      <div className={styles.activity}>
        <h3>Actividad acumulada</h3>
        <div><UsersRound size={17} aria-hidden="true" /><span>Pacientes con citas</span><strong>{data?.estadisticas?.pacientes_totales ?? 0}</strong></div>
        <div><ClipboardList size={17} aria-hidden="true" /><span>Registros clínicos</span><strong>{data?.estadisticas?.diagnosticos ?? 0}</strong></div>
      </div>
    </section>
  );
}
