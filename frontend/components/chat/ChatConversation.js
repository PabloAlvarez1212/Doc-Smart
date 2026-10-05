"use client";
import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import Button from '../ui/Button/Button';
import { ChatAvatar, ChatStatus, ChatMessage, ChatComposer, ClinicalActions, ChatConnection } from './ChatUI';
import { formatDate, chatError, presentation } from './chatState.mjs';
import useChatConversation from './useChatConversation';
import styles from './Chat.module.css';

export default function ChatConversation({ id, role }) {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) return <section className={styles.page}>
    <Link className={styles.back} href={`/${role === 'medico' ? 'doctor' : 'patient'}/my-chats`}>← Volver a Mis chats</Link>
    <p className={styles.error} role="alert">La conversación no está disponible.</p>
  </section>;
  return <ConversationScreen key={`${role}:${id}`} id={Number(id)} role={role} />;
}

function ConversationScreen({ id, role }) {
  const chat = useChatConversation(id, role);
  const { state } = chat;
  const [downloading, setDownloading] = useState(null);
  const [fileError, setFileError] = useState('');
  const history = useRef(null);
  const scrollIntent = useRef({ type: 'bottom' });
  const nearBottom = useRef(true);
  const back = `/${role === 'medico' ? 'doctor' : 'patient'}/my-chats`;
  const conversation = state.conversation;
  const busy = state.loading || state.loadingOlder || state.sending || state.uploading || state.acting;

  useLayoutEffect(() => {
    const node = history.current;
    const intent = scrollIntent.current;
    if (!node) return;
    if (intent) node.scrollTop = intent.type === 'older' ? node.scrollHeight - intent.height + intent.top : node.scrollHeight;
    else if (nearBottom.current) node.scrollTop = node.scrollHeight;
    scrollIntent.current = null;
  }, [state.messages]);

  async function loadOlder() {
    const node = history.current;
    if (node) scrollIntent.current = { type: 'older', height: node.scrollHeight, top: node.scrollTop };
    await chat.loadOlder();
  }
  async function send() {
    scrollIntent.current = { type: 'bottom' };
    await chat.send();
  }
  async function download(fileId) {
    if (downloading) return;
    setFileError(''); setDownloading(fileId);
    try {
      const result = await chat.attachmentUrl(fileId);
      const url = new URL(result.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URL inválida');
      const link = document.createElement('a');
      link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
      document.body.appendChild(link); link.click(); link.remove();
    } catch (error) {
      setFileError(chatError(error).message);
      if (chatError(error).denied) await chat.refresh();
    } finally { setDownloading(null); }
  }
  async function action(kind) {
    const response = await Swal.fire({
      title: kind === 'inasistencia' ? '¿Registrar inasistencia del paciente?' : '¿Habilitar el chat?',
      text: kind === 'inasistencia' ? 'La cita se marcará como inasistencia del paciente y el chat quedará cerrado.' : 'El paciente podrá intercambiar mensajes contigo antes de la apertura programada.',
      icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, confirmar', cancelButtonText: 'Cancelar',
      confirmButtonColor: role === 'medico' ? '#157347' : '#1733a4',
    });
    if (response.isConfirmed) await chat.action(kind);
  }
  return <section className={`${styles.page} ${role === 'medico' ? styles.doctor : ''}`}>
    {state.error && <div role="alert" className={styles.error}>{state.error}</div>}
    {fileError && <div role="alert" className={styles.error}>{fileError}</div>}
    {!conversation && <>
      <Link className={styles.back} href={back}>← Volver a Mis chats</Link>
      {state.loading ? <p role="status" className={styles.loading}><span className={styles.spinner} />Cargando conversación…</p>
        : <div className={styles.empty}><p>{state.denied ? 'No puedes acceder a esta conversación con tu sesión actual.' : 'No pudimos cargar esta conversación.'}</p><Button onClick={chat.refresh} className={styles.primary}>Reintentar</Button></div>}
    </>}
    {conversation && !state.denied && <>
      <div className={styles.panel}>
        <header className={styles.chatHeader}>
          <div className={styles.row}><Link className={styles.back} href={back}>← Mis chats</Link>
            <Button className={styles.primary} disabled={busy} onClick={chat.refresh}>{state.loading ? 'Actualizando…' : 'Actualizar'}</Button></div>
          <div className={styles.participant}>
            <ChatAvatar participant={conversation.otro_participante} />
            <div><h1>{conversation.otro_participante?.nombre} {conversation.otro_participante?.apellido}</h1>
              <p className={styles.meta}>Cita #{conversation.cita.id} · {formatDate(conversation.cita.fecha_programada)} · {conversation.cita.estado}</p></div>
            <ChatStatus conversation={conversation} role={role} />
          </div>
          <p className={styles.meta}>{presentation(conversation, role).explanation}</p>
          {conversation.estado === 'programado' && <p className={styles.meta}>Apertura programada: {formatDate(conversation.fecha_habilitacion_automatica)}</p>}
          {conversation.fecha_cierre_automatico && <p className={styles.meta}>Ventana posterior a la cita hasta {formatDate(conversation.fecha_cierre_automatico)}</p>}
          <p className={styles.meta}>{conversation.no_leidos || 0} mensajes sin leer</p>
          <ChatConnection connection={state.connection} />
          <ClinicalActions conversation={conversation} role={role} busy={busy} onAction={action} />
        </header>
        <div ref={history} className={styles.history} aria-label="Historial de conversación" aria-busy={state.loading || state.loadingOlder}
          onScroll={event => { const node = event.currentTarget; nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }}>
          {state.hasMore && <div className={styles.older}><Button variant="secundary" disabled={busy} onClick={loadOlder}>{state.loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores'}</Button></div>}
          {!state.messages.length && <p className={styles.empty}>Todavía no hay mensajes en esta conversación.</p>}
          <ol className={styles.messages}>{state.messages.map(message => <ChatMessage key={message.id} message={message} role={role} readCursor={state.remoteReadCursor} onDownload={download} downloading={downloading} />)}</ol>
        </div>
      </div>
      {state.readError && <p role="status" className={styles.notice}>{state.readError}</p>}
      {state.historyNotice && <p role="status" className={styles.notice}>{state.historyNotice}</p>}
      {state.remoteTyping && <p role="status" className={styles.meta}>Escribiendo…</p>}
      <ChatComposer state={state} role={role} onText={chat.setText} onSend={send} onFiles={chat.upload} onRemove={chat.removeAttachment} />
    </>}
  </section>;
}
