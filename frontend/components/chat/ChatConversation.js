"use client";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import ChatWorkspaceContext from './ChatWorkspaceContext';
import useChatViewport from './useChatViewport';
import { ArrowDown, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import Button from '../ui/Button/Button';
import { ChatAvatar, ChatPresence, ChatStatus, ChatMessage, ChatComposer, ClinicalActions, ChatConnection } from './ChatUI';
import { formatDate, chatError, presentation } from './chatState.mjs';
import useChatConversation from './useChatConversation';
import './chat-layout.css';
import styles from './Chat.module.css';

export default function ChatConversation({ id, role, embedded = false }) {
  if (!/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) return <section className={embedded ? styles.embeddedConversation : styles.page}>
    <Link className={styles.back} href={`/${role === 'medico' ? 'doctor' : 'patient'}/my-chats`}>← Volver a Mis chats</Link>
    <p className={styles.error} role="alert">La conversación no está disponible.</p>
  </section>;
  return <ConversationScreen key={`${role}:${id}`} id={Number(id)} role={role} embedded={embedded} />;
}

function ConversationScreen({ id, role, embedded }) {
  const publish = useContext(ChatWorkspaceContext);
  const viewportRef = useChatViewport();
  const reduced = useReducedMotion();
  const chat = useChatConversation(id, role);
  const { state } = chat;
  const [downloading, setDownloading] = useState(null);
  const [fileError, setFileError] = useState('');
  const history = useRef(null);
  const panel = useRef(null);
  const lastMessage = useRef(0);
  const firstBatch = useRef(null);
  const [newMessages, setNewMessages] = useState(0);
  const scrollIntent = useRef({ type: 'bottom' });
  const nearBottom = useRef(true);
  const back = `/${role === 'medico' ? 'doctor' : 'patient'}/my-chats`;
  const conversation = state.conversation;
  useEffect(() => {
    if (conversation && publish) publish({...conversation, ultimo_mensaje: state.messages.at(-1) || conversation.ultimo_mensaje, fecha_ultimo_mensaje: state.messages.at(-1)?.fecha_creacion || conversation.fecha_ultimo_mensaje});
  }, [conversation, state.messages, publish]);
  const busy = state.loading || state.loadingOlder || state.sending || state.uploading || state.acting;

  useLayoutEffect(() => {
    const node = history.current;
    const intent = scrollIntent.current;
    if (!node) return;
    if (intent) node.scrollTop = intent.type === 'older' ? node.scrollHeight - intent.height + intent.top : node.scrollHeight;
    else if (nearBottom.current) node.scrollTop = node.scrollHeight;
    const latest = state.messages.at(-1)?.id || 0;
    if (firstBatch.current === null && state.messages.length) firstBatch.current = latest;
    if (!intent && !nearBottom.current) {
      const added = state.messages.filter(message => message.id > lastMessage.current && message.emisor?.tipo !== role && message.tipo !== 'sistema').length;
      if (added) setNewMessages(count => count + added);
    } else setNewMessages(0);
    lastMessage.current = Math.max(lastMessage.current, latest);
    scrollIntent.current = null;
  }, [state.messages]);

  useEffect(() => {
    const node = panel.current;
    const editor = node?.querySelector('form');
    if (!node || !editor || !history.current) return;
    const observer = new ResizeObserver(() => {
      node.style.setProperty('--chat-composer-height', `${editor.offsetHeight}px`);
      if (nearBottom.current && history.current) history.current.scrollTop = history.current.scrollHeight;
    });
    observer.observe(editor); observer.observe(history.current);
    return () => observer.disconnect();
  }, [!!conversation]);

  function jumpToLatest() {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
    nearBottom.current = true; setNewMessages(0);
  }

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
  return <section ref={embedded ? undefined : viewportRef} data-chat-page={embedded ? undefined : "conversation"} data-chat-conversation="true" className={`${embedded ? styles.embeddedConversation : styles.page} ${styles.conversationPage} ${role === 'medico' ? styles.doctor : ''}`}>
    <div className={styles.conversationLayout}><motion.div className={styles.conversationColumn} initial={reduced ? false : { opacity: .6, transform: "translateX(6px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} transition={{ duration: reduced ? 0 : .22, ease: [.16,1,.3,1] }}>
    {state.error && <div role="alert" className={styles.error}>{state.error}</div>}
    {fileError && <div role="alert" className={styles.error}>{fileError}</div>}
    {!conversation && <>
      <Link className={styles.back} href={back}>← Volver a Mis chats</Link>
      {state.loading ? <p role="status" className={styles.loading}><span className={styles.spinner} />Cargando conversación…</p>
        : <div className={styles.empty}><p>{state.denied ? 'No puedes acceder a esta conversación con tu sesión actual.' : 'No pudimos cargar esta conversación.'}</p><Button onClick={chat.refresh} className={styles.primary}>Reintentar</Button></div>}
    </>}
    {conversation && !state.denied && <>
      <div ref={panel} className={styles.panel}>
        <header className={styles.chatHeader}>
          <div className={styles.conversationTop}>
            <Link className={styles.back} href={back} aria-label="Volver a Mis chats"><ArrowLeft size={18} aria-hidden="true" /><span>Mis chats</span></Link>
            <ChatAvatar participant={conversation.otro_participante} />
            <div className={styles.participantInfo}><div className={styles.nameLine}><h1>{conversation.otro_participante?.nombre} {conversation.otro_participante?.apellido}</h1><ChatPresence presence={state.remotePresence} /></div>
              <p className={styles.meta}>Cita #{conversation.cita.id} · {formatDate(conversation.cita.fecha_programada)}</p></div>
            <Button className={styles.refreshButton} disabled={busy} onClick={chat.refresh} aria-label="Actualizar conversación"><RefreshCw size={17} aria-hidden="true" /></Button>
          </div>
          <details className={styles.consultationInfo}><summary>Detalles de la consulta</summary>
          <ChatStatus conversation={conversation} role={role} />
          <p className={styles.meta}>{presentation(conversation, role).explanation}</p>
          {conversation.estado === 'programado' && <p className={styles.meta}>Apertura programada: {formatDate(conversation.fecha_habilitacion_automatica)}</p>}
          {conversation.fecha_cierre_automatico && <p className={styles.meta}>Ventana posterior a la cita hasta {formatDate(conversation.fecha_cierre_automatico)}</p>}
          <p className={styles.meta}>{conversation.no_leidos || 0} mensajes sin leer</p>
          <ClinicalActions conversation={conversation} role={role} busy={busy} onAction={action} />
          </details>
          <ChatConnection connection={state.connection} />
        </header>
        <div ref={history} className={styles.history} aria-label="Historial de conversación" aria-busy={state.loading || state.loadingOlder}
          onScroll={event => { const node = event.currentTarget; nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; if (nearBottom.current) setNewMessages(0); }}>
          {state.hasMore && <div className={styles.older}><Button variant="secundary" disabled={busy} onClick={loadOlder}>{state.loadingOlder ? 'Cargando…' : 'Cargar mensajes anteriores'}</Button></div>}
          {!state.messages.length && <p className={styles.empty}>Todavía no hay mensajes en esta conversación.</p>}
          <ol className={styles.messages}>{state.messages.map(message => <ChatMessage key={message.id} message={message} role={role} readCursor={state.remoteReadCursor} onDownload={download} downloading={downloading} animate={firstBatch.current !== null && message.id > firstBatch.current && !state.loadingOlder} />)}</ol>
        </div>
      {newMessages > 0 && <button type="button" className={styles.newMessages} onClick={jumpToLatest}><ArrowDown size={16} aria-hidden="true" />{newMessages} {newMessages === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}</button>}
      <span className={styles.srOnly} role="status">{newMessages > 0 ? `${newMessages} mensajes nuevos. Puedes ir al final de la conversación.` : ''}</span>
      {state.readError && <p role="status" className={styles.notice}>{state.readError}</p>}
      {state.historyNotice && <p role="status" className={styles.notice}>{state.historyNotice}</p>}
      {state.remoteTyping && <p role="status" className={styles.meta}>Escribiendo…</p>}
      <ChatComposer state={state} role={role} onText={chat.setText} onSend={send} onFiles={chat.upload} onRemove={chat.removeAttachment} />
      </div>
    </>}
    </motion.div></div>
  </section>;
}
