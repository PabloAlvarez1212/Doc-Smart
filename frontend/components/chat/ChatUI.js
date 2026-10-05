"use client";
import Image from 'next/image'
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
        <Image
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
  const label = { connecting: 'Conectando…', connected: 'Conectado en tiempo real', reconnecting: 'Reconectando…',
    offline: 'Sin conexión a la red. Tu borrador se conserva.', disconnected: 'Tiempo real no disponible. Puedes enviar por REST o usar Actualizar.' };
  return <p role="status" className={styles.meta}>{label[connection] || label.disconnected}</p>;
}

export function ChatListView({ role, data, page, loading, onPage }) {
  const root = role === 'medico' ? 'doctor' : 'patient';
  return <>
    <div className={styles.list}>
      {(data?.results || []).map(conversation => {
        const person = conversation.otro_participante;
        const last = conversation.ultimo_mensaje;
        const preview = last?.tipo === 'sistema' ? systemText(last) : last?.contenido || (last?.adjuntos?.length ? 'Archivo adjunto' : 'Todavía no hay mensajes.');
        return <Link key={conversation.id} href={`/${root}/my-chats/${conversation.id}`} className={styles.card}>
          <ChatAvatar participant={person} />
          <div className={styles.cardContent}>
            <div className={styles.row}><h2>{person?.nombre} {person?.apellido}</h2><ChatStatus conversation={conversation} role={role} /></div>
            <p className={styles.meta}>Cita #{conversation.cita.id} · {formatDate(conversation.cita.fecha_programada)}</p>
            {person?.especialidad && <p className={styles.meta}>{person.especialidad}</p>}
            <p className={styles.preview}>{preview}</p>
            <div className={styles.row}>
              <small>{conversation.fecha_ultimo_mensaje ? formatDate(conversation.fecha_ultimo_mensaje) : 'Sin actividad de mensajes'}</small>
              {conversation.no_leidos > 0 && <span className={styles.unread}>{conversation.no_leidos} sin leer</span>}
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

export function ChatMessage({ message, role, onDownload, downloading, readCursor = 0 }) {
  if (message.tipo === 'sistema') return <li className={styles.system}>
    <p>{systemText(message)}</p><time dateTime={message.fecha_creacion}>{formatDate(message.fecha_creacion)}</time>
  </li>;
  const own = message.emisor?.tipo === role;
  return <li className={`${styles.messageRow} ${own ? styles.own : styles.received}`}>
    <article className={styles.bubble}>
      <strong>{message.tipo === 'nota_previa' ? 'Nota previa' : own ? 'Tú' : message.emisor?.tipo === 'medico' ? 'Médico' : 'Paciente'}</strong>
      {message.contenido && <p className={styles.messageText}>{message.contenido}</p>}
      {(message.adjuntos || []).map(file => <Button key={file.id} variant="secundary" size="sm" className={styles.file}
        disabled={downloading === file.id} onClick={() => onDownload(file.id)} aria-label={`Abrir o descargar ${file.nombre}`}>
        {downloading === file.id ? 'Obteniendo archivo…' : file.nombre}
        <small>{file.content_type === 'application/pdf' ? 'PDF' : 'Imagen'}{file.tamano ? ` · ${(file.tamano / 1024).toFixed(1)} KB` : ''}</small>
      </Button>)}
      <time dateTime={message.fecha_creacion}>{formatDate(message.fecha_creacion)}</time>
      {own && message.id <= readCursor && <small className={styles.meta}>Leído</small>}
    </article>
  </li>;
}

export function ChatComposer({ state, role, onText, onSend, onFiles, onRemove }) {
  const view = presentation(state.conversation, role);
  const allowed = view.canWrite || view.canNote;
  const busy = state.sending || state.uploading || state.acting || state.loading || state.loadingOlder;
  const frozen = busy || !!state.pending || !allowed;
  const hasPayload = state.pending || state.text?.trim() || state.attachments?.length;
  return <form className={styles.composer} onSubmit={event => { event.preventDefault(); onSend(); }}>
    <p id="chat-compose-help" className={styles.meta}>
      {state.pending ? 'El envío no fue confirmado. Reintentar recupera el mismo mensaje sin duplicarlo, aunque el chat se haya cerrado.'
        : view.canNote ? 'Puedes enviar una única nota previa al médico. Esta nota no activa el chat.' : view.explanation}
    </p>
    <label className={styles.label} htmlFor="chat-text">{view.canNote ? 'Nota previa' : 'Mensaje'}</label>
    <textarea id="chat-text" value={state.text || ''} onChange={event => onText(event.target.value)}
      disabled={frozen} maxLength={4000} rows={3} aria-describedby="chat-compose-help" placeholder={allowed ? 'Escribe tu mensaje…' : 'Envío no disponible'} />
    <div className={styles.pendingFiles}>
      {(state.attachments || []).map(file => <span key={file.id}>
        {file.nombre}<button type="button" disabled={frozen} aria-label={`Quitar ${file.nombre}`} onClick={() => onRemove(file.id)}>×</button>
      </span>)}
    </div>
    <div className={styles.composerFooter}>
      <div>
        <label className={styles.label} htmlFor="chat-files">Adjuntar archivos</label>
        <input id="chat-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
          disabled={frozen || (state.attachments?.length || 0) >= 5}
          onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; onFiles(files); }} />
        <small>Hasta 5 archivos · imágenes 8 MiB · PDF 10 MiB</small>
      </div>
      <div className={styles.send}>
        <small>{state.text?.length || 0}/4000</small>
        <Button type="submit" className={styles.primary} disabled={busy || !hasPayload || (!allowed && !state.pending)}>
          {state.sending ? 'Enviando…' : state.uploading ? 'Subiendo…' : state.pending ? 'Reintentar mismo mensaje' : view.canNote ? 'Enviar nota previa' : 'Enviar mensaje'}
        </Button>
      </div>
    </div>
  </form>;
}
