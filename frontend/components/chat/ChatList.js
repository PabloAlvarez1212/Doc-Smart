"use client";
import { useEffect, useState } from 'react';
import useChatViewport from './useChatViewport';
import './chat-layout.css';
import chatService from '@/app/services/chatServices';
import { MessageSquare } from 'lucide-react';
import Button from '../ui/Button/Button';
import { ChatListView } from './ChatUI';
import { chatError } from './chatState.mjs';
import styles from './Chat.module.css';
import { useNotificationsContext } from '../contex/NotificationsContext';

export default function ChatList({ role, embedded = false, selectedId, selectedConversation, conversationUpdates = {} }) {
  const viewportRef = useChatViewport();
  const { notificaciones } = useNotificationsContext();
  const activity = notificaciones.filter(notification => notification.conversacion_id).map(notification => `${notification.id}:${notification.leida}`).join(',');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
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
  return <section ref={embedded ? undefined : viewportRef} data-chat-page={embedded ? undefined : "list"} className={`${embedded ? styles.sidebar : styles.page} ${role === 'medico' ? styles.doctor : ''}`}>
    <div className={embedded ? styles.sidebarBody : styles.listWorkspace}><div className={styles.listColumn}>
    {loading && <p role="status" className={styles.loading}><span className={styles.spinner} />Cargando conversaciones…</p>}
    {error && <div className={styles.error} role="alert"><p>{error}</p><Button variant="secundary" onClick={() => setReload(value => value + 1)}>Reintentar</Button></div>}
    {!loading && !error && data?.results?.length === 0 && <p className={styles.empty}>Todavía no tienes conversaciones disponibles. Los chats aparecen cuando tu cita ha sido confirmada.</p>}
    {data && <ChatListView role={role} data={{...data, results: data.results?.map(item => ({...item, ...conversationUpdates[item.id], ...(item.id === selectedConversation?.id ? selectedConversation : {})}))}} page={page} onPage={setPage} loading={loading} selectedId={selectedId} />}
    </div>{!embedded && <ChatWelcome role={role} />}</div>
  </section>;
}

export function ChatWelcome({role}) {
  return <div className={styles.welcome}><MessageSquare size={36} strokeWidth={1.4} aria-hidden="true" /><h2>Un espacio para conversar</h2><p>Selecciona una conversación para consultar tu historial y continuar el contacto con {role === 'medico' ? 'tu paciente' : 'tu médico'}.</p><span>Conversaciones vinculadas a tus citas</span></div>;
}
