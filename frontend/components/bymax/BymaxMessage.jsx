"use client";
import { Fragment } from "react";
import Image from "next/image";
import { AlertCircle, CalendarDays, Stethoscope, Play, Square, LoaderCircle } from "lucide-react";
import { messageBlocks } from "./bymaxPresentation.mjs";
import styles from "./BymaxAssistant.module.css";
function fechaCorta(valor) {
  if (!valor) return "Ahora";
  if (Number.isNaN(new Date(valor).getTime())) return String(valor);
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(valor));
}

// En las respuestas de Bymax cada palabra es un elemento propio: al llegar por streaming, aparece con su animación.
function palabras(text, clave) {
  return text.split(/(\s+)/).map((parte, index) => /^\s*$/.test(parte) ? parte : <span key={`${clave}-${index}`} className={styles.word}>{parte}</span>);
}

function emphasis(text, animado = false) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const negrita = part.startsWith("**") && part.endsWith("**");
    const contenido = negrita ? part.slice(2, -2) : part;
    const hijos = animado ? palabras(contenido, index) : contenido;
    return negrita ? <strong key={index}>{hijos}</strong> : <Fragment key={index}>{hijos}</Fragment>;
  });
}

function TarjetasResultado({ resultado }) {
  const data = resultado?.data || resultado;
  const medicos = data?.medicos;
  const citas = data?.citas;
  if (!Array.isArray(medicos) && !Array.isArray(citas)) return null;
  const elementos = medicos || citas;
  const esMedico = Boolean(medicos);
  return (
    <div className={styles.resultGrid}>
      {elementos.map((item, index) => (
        <article className={styles.resultCard} key={item.id || item.id_medico || index}>
          <div className={styles.resultIcon}>
            {esMedico ? <Stethoscope size={18} /> : <CalendarDays size={18} />}
          </div>
          <div>
            <strong>{item.paciente?.nombre || item.nombre || item.medico || `Cita #${item.id_cita || item.id}`}</strong>
            {!esMedico && item.codigo_cita && <span>Código: {item.codigo_cita}</span>}
            {item.especialidad && <span>{item.especialidad}</span>}
            {item.ciudad && <span>{item.ciudad}</span>}
            {item.fecha && <span>{fechaCorta(item.fecha)}</span>}
            {item.fecha_programada && <span>{fechaCorta(item.fecha_programada)}</span>}
            {item.estado && <span className={styles.status}>{item.estado}</span>}
          </div>
        </article>
      ))}
    </div>
  );
}

function ContenidoMensaje({ mensaje, animado }) {
  return (
    <>
      {mensaje.imagen && (
        <Image className={styles.messageImage} src={mensaje.imagen} alt="Imagen médica adjunta" width={280} height={180} unoptimized />
      )}
      <div className={styles.messageText}>
        {messageBlocks(mensaje.texto).map((block, index) => {
          if (block.type === "space") return null;
          if (block.type === "p") return <p key={index}>{emphasis(block.lines.join("\n"), animado)}</p>;
          const List = block.type;
          return <List key={index} start={block.start}>{block.lines.map((line, lineIndex) => <li key={lineIndex}>{emphasis(line, animado)}</li>)}</List>;
        })}
      </div>
      <TarjetasResultado resultado={mensaje.resultado} />
    </>
  );
}


export default function BymaxMessage({ item, voice, streaming }) {
  const bot = item.remitente === "bot";
  const selected = voice.messageId === item.id;
  const active = selected && ["speaking", "starting"].includes(voice.playback);
  const preparing = selected && voice.playback === "preparing";
  const ready = selected && voice.playback === "ready";
  return <div className={`${styles.messageRow} ${bot ? "" : styles.userRow}`}>
    {bot && <Image className={styles.miniAvatar} src="/icons/asistente_bymax.png" alt="" width={32} height={32}/>}
    <article className={`${styles.bubble} ${bot ? styles.botBubble : styles.userBubble} ${item.error ? styles.errorBubble : ""}`}>
      <span className={styles.sender}>{item.error && <AlertCircle size={14} aria-hidden="true"/>}{bot ? "Bymax" : "Tú"}{item.error ? " · No se completó la solicitud" : ""}</span>
      <ContenidoMensaje mensaje={item} animado={bot}/>
      {streaming && !item.texto && <span className={styles.typing}><i/><i/><i/><span>Preparando tu respuesta…</span></span>}
      <div className={styles.messageFooter}>
        <time>{fechaCorta(item.fecha)}</time>
        {item.cortado && <span className={styles.cutTag}>Interrumpida</span>}
        {bot && !item.error && item.texto && (!streaming || ready || active || preparing) &&
          <button type="button" className={styles.messageVoice} disabled={preparing}
            onClick={() => active ? voice.stopPlayback() : voice.play(item.texto, item.id)}
            aria-label={active ? "Detener respuesta" : ready ? "Reproducir audio listo" : "Reproducir respuesta"}>
            {preparing ? <LoaderCircle size={14} className={styles.spin}/> : active ? <Square size={14}/> : <Play size={14}/>}
            {preparing ? "Preparando…" : active ? "Detener" : ready ? "Reproducir audio listo" : "Escuchar"}
          </button>}
      </div>
    </article>
  </div>;
}
