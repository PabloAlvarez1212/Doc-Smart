"use client";
import { useEffect, useState } from 'react';
import chatService from '@/app/services/chatServices';
import Button from '../ui/Button/Button';
import { ChatListView } from './ChatUI';
import { chatError } from './chatState.mjs';
import styles from './Chat.module.css';
import { useNotificationsContext } from '../contex/NotificationsContext';

export default function ChatList({ role }) {
  const { notificaciones } = useNotificationsContext();
  const activity = notificaciones.filter(notification => notification.conversacion_id).map(notification => `${notification.id}:${notification.leida}`).join(',');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setData(null);
    chatService.listar({ page, page_size: 20 }).then(result => { if (!cancelled) setData(result); })
      .catch(error => { if (!cancelled) setError(chatError(error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, reload, activity]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setReload(value => value + 1); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return <section className={`${styles.page} ${role === 'medico' ? styles.doctor : ''}`}>
    <header className={styles.heading}>
      <div><h1>Mis chats</h1><p>Conversaciones con {role === 'medico' ? 'tus pacientes' : 'tus médicos'} vinculadas a tus citas.</p></div>
      <Button className={styles.primary} disabled={loading} onClick={() => setReload(value => value + 1)}>Actualizar</Button>
    </header>
    {loading && <p role="status" className={styles.loading}><span className={styles.spinner} />Cargando conversaciones…</p>}
    {error && <div className={styles.error} role="alert"><p>{error}</p><Button variant="secundary" onClick={() => setReload(value => value + 1)}>Reintentar</Button></div>}
    {!loading && !error && data?.results?.length === 0 && <p className={styles.empty}>Todavía no tienes conversaciones disponibles. Los chats aparecen cuando tu cita ha sido confirmada.</p>}
    {data && <ChatListView role={role} data={data} page={page} onPage={setPage} loading={loading} />}
  </section>;
}
