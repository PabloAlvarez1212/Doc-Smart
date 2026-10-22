"use client";
import { useLayoutEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Paperclip, FileText, X, Send } from 'lucide-react';
import ProfilePhoto from '../ui/ProfilePhoto/ProfilePhoto';
import Link from "next/link";
import Button from '../ui/Button/Button.js';
import { formatDate, presentation, systemText } from './chatState.mjs';
import styles from './Chat.module.css';

export function ChatAvatar({ participant }) {
  const name = `${participant?.nombre || ''} ${participant?.apellido || ''}`.trim();

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('') || '?';

  return (
    <span className={styles.avatar}>
      {participant?.foto_perfil ? (
        <ProfilePhoto
          src={participant.foto_perfil}
          alt={`Foto de perfil de ${name}`}
          width={48}
          height={48}
          className={styles.avatarImage}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

export function ChatStatus({ conversation, role }) {
  const view = presentation(conversation, role);
  return <span className={`${styles.status} ${styles[conversation?.estado] || ''}`}>{view.label}</span>;
}

export function ChatConnection({ connection }) {
  if (connection === 'connected') return null;
  const label = { connecting: 'Conectando…', reconnecting: 'Reconectando…',
    offline: 'Sin conexión a la red. Tu borrador se conserva.', disconnected: 'Tiempo real no disponible. Usa Actualizar para comprobar si hay mensajes nuevos.' };
  return <p role="status" className={`${styles.connection} ${connection === "connected" ? styles.connected : ""}`}>{label[connection] || label.disconnected}</p>;
}

export function ChatPresence({ presence }) {
  const label = presence === 'online' ? 'En línea' : presence === 'offline' ? 'Desconectado' : 'Presencia no disponible';
  return <span role="status" className={`${styles.presence} ${presence === 'online' ? styles.online : presence === 'offline' ? styles.offline : ''}`}><span aria-hidden="true" />{label}</span>;
}

export function ChatListView({ role, data, page, loading, onPage, selectedId }) {
  const root = role === 'medico' ? 'doctor' : 'patient';
  return <>
    <div className={styles.list}>
      {(data?.results || []).map(conversation => {
        const person = conversation.otro_participante;
        const last = conversation.ultimo_mensaje;
        const preview = last?.tipo === 'sistema' ? systemText(last) : last?.contenido || (last?.adjuntos?.length ? 'Archivo adjunto' : 'Todavía no hay mensajes.');
        return <Link key={conversation.id} href={`/${root}/my-chats/${conversation.id}`} className={`${styles.card} ${Number(selectedId) === conversation.id ? styles.selected : ""}`} aria-current={Number(selectedId) === conversation.id ? "page" : undefined}>
          <ChatAvatar participant={person} />
          <div className={styles.cardContent}>
            <div className={styles.row}><h3>{person?.nombre} {person?.apellido}</h3>{conversation.no_leidos > 0 && <span className={styles.unread}>{conversation.no_leidos} sin leer</span>}</div>
            <p className={styles.preview}>{preview}</p>
            <div className={styles.row}>
              <small>{conversation.fecha_ultimo_mensaje ? formatDate(conversation.fecha_ultimo_mensaje) : 'Sin actividad de mensajes'}</small>
              <ChatStatus conversation={conversation} role={role} />
            </div>
            {conversation.estado === 'programado' && <small>Disponible desde {formatDate(conversation.fecha_habilitacion_automatica)} o cuando el médico lo habilite.</small>}
          </div>
        </Link>;
      })}
    </div>
    {(data?.next || data?.previous) && <nav aria-label="Páginas de conversaciones" className={styles.pagination}>
      <Button variant="secundary" disabled={loading || !data.previous} onClick={() => onPage(data.previous)}>Anterior</Button>
      <span>Página {page} · {data.count} conversaciones</span>
      <Button className={styles.primary} disabled={loading || !data.next} onClick={() => onPage(data.next)}>Siguiente</Button>
    </nav>}
  </>;
}

export function ClinicalActions({ conversation, role, busy, onAction }) {
  const view = presentation(conversation, role);
  if (!view.canEnable && !view.canAbsence) return null;
  return <div className={styles.actions}>
    {view.canEnable && <Button className={styles.primary} disabled={busy} onClick={() => onAction('habilitar')}>Habilitar chat</Button>}
    {view.canAbsence && <Button variant="warning" disabled={busy} onClick={() => onAction('inasistencia')}>Inasistencia del paciente</Button>}
  </div>;
}

export function ChatMessage({ message, role, onDownload, downloading, readCursor = 0, animate = false }) {
  const reduced = useReducedMotion();
  if (message.tipo === 'sistema') return <li className={styles.system}>
    <p>{systemText(message)}</p><time dateTime={message.fecha_creacion}>{formatDate(message.fecha_creacion)}</time>
  </li>;
  const own = message.emisor?.tipo === role;
  return <motion.li initial={animate && !reduced ? { opacity: .4, transform: "translateY(5px)" } : false} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: reduced ? 0 : .2, ease: [.16,1,.3,1] }} className={`${styles.messageRow} ${own ? styles.own : styles.received}`}>
    <article className={styles.bubble}>
      <strong>{message.tipo === 'nota_previa' ? 'Nota previa' : own ? 'Tú' : message.emisor?.tipo === 'medico' ? 'Médico' : 'Paciente'}</strong>
      {message.contenido && <p className={styles.messageText}>{message.contenido}</p>}
      {(message.adjuntos || []).map(file => <Button key={file.id} variant="secundary" size="sm" className={styles.file}
        disabled={downloading === file.id} onClick={() => onDownload(file.id)} aria-label={`Abrir o descargar ${file.nombre}`}>
        <FileText size={17} aria-hidden="true" />{downloading === file.id ? 'Obteniendo archivo…' : file.nombre}
        <small>{file.content_type === 'application/pdf' ? 'PDF' : 'Imagen'}{file.tamano ? ` · ${(file.tamano / 1024).toFixed(1)} KB` : ''}</small>
      </Button>)}
      <time dateTime={message.fecha_creacion}>{formatDate(message.fecha_creacion)}</time>
      {own && message.id <= readCursor && <small className={styles.meta}>Leído</small>}
    </article>
  </motion.li>;
}

export function ChatComposer({ state, role, onText, onSend, onFiles, onRemove }) {
  const reduced = useReducedMotion();
  const textRef = useRef(null);
  useLayoutEffect(() => {
    const field = textRef.current;
    if (!field) return;
    field.style.height = '0px';
    field.style.height = `${Math.min(field.scrollHeight, 132)}px`;
  }, [state.text]);
  const view = presentation(state.conversation, role);
  const allowed = view.canWrite || view.canNote;
  const busy = state.sending || state.uploading || state.acting || state.loading || state.loadingOlder;
  const frozen = busy || !!state.pending || !allowed;
  const hasPayload = state.pending || state.text?.trim() || state.attachments?.length;
  const canSubmit = !busy && Boolean(hasPayload) && (allowed || Boolean(state.pending));
  return <form className={styles.composer} onSubmit={event => { event.preventDefault(); if (canSubmit) onSend(); }}>
    {(state.pending || view.canNote || !allowed) && <p id="chat-compose-help" className={styles.meta}>
      {state.pending ? 'El envío no fue confirmado. Reintentar recupera el mismo mensaje sin duplicarlo, aunque el chat se haya cerrado.'
        : view.canNote ? 'Puedes enviar una única nota previa al médico. Esta nota no activa el chat.' : view.explanation}
    </p>}
    <div className={styles.composeLine}>
    <label className={styles.label} htmlFor="chat-text">{view.canNote ? 'Nota previa' : 'Mensaje'}</label>
    <textarea ref={textRef} id="chat-text" value={state.text || ''} onChange={event => onText(event.target.value)}
      aria-keyshortcuts="Enter" title="Enter para enviar · Shift + Enter para un salto de línea"
      onKeyDown={event => {
        if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
        event.preventDefault();
        if (!event.repeat && !frozen && canSubmit) event.currentTarget.form?.requestSubmit();
      }}
      disabled={frozen} maxLength={4000} rows={1} aria-describedby={state.pending || view.canNote || !allowed ? "chat-compose-help" : undefined} placeholder={allowed ? 'Escribe tu mensaje…' : 'Envío no disponible'} />
    <div className={styles.composeTools} data-expanded={Boolean(state.pending || state.uploading || state.sending || view.canNote)}>
      <label className={styles.attachButton} htmlFor="chat-files" title="Adjuntar imágenes o PDF"><Paperclip size={19} aria-hidden="true" /><span className={styles.srOnly}>Adjuntar archivos</span></label>
      <input id="chat-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" disabled={frozen || (state.attachments?.length || 0) >= 5} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; onFiles(files); }} />
      <Button type="submit" className={styles.primary} disabled={!canSubmit} aria-label={state.sending ? 'Enviando…' : state.uploading ? 'Subiendo…' : state.pending ? 'Reintentar mismo mensaje' : view.canNote ? 'Enviar nota previa' : 'Enviar mensaje'}>
        {state.sending ? 'Enviando…' : state.uploading ? 'Subiendo…' : state.pending ? 'Reintentar mismo mensaje' : view.canNote ? 'Enviar nota previa' : <><Send size={17} aria-hidden="true" /><span className={styles.srOnly}>Enviar mensaje</span></>}
      </Button>
    </div></div>
    <div className={styles.pendingFiles}>
      {(state.attachments || []).map(file => <motion.span key={file.id} initial={reduced ? false : { opacity: 0, transform: "translateY(4px)" }} animate={{ opacity: 1, transform: "translateY(0px)" }} transition={{ duration: reduced ? 0 : .18 }}>
        {file.nombre}<button type="button" disabled={frozen} aria-label={`Quitar ${file.nombre}`} onClick={() => onRemove(file.id)}><X size={16} aria-hidden="true" /></button>
      </motion.span>)}
    </div>
    {state.text?.length > 3400 && <small className={styles.characterCount}>{state.text.length}/4000 caracteres</small>}
  </form>;
}
