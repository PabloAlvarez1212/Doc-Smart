"use client";
import Image from "next/image";
import { CalendarDays, Stethoscope, Play, Square, LoaderCircle } from "lucide-react";
import styles from "./BymaxAssistant.module.css";
function fechaCorta(valor) {
  if (!valor) return "Ahora";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(valor));
}

function normalizarMensaje(item) {
  return {
    id: item.id || crypto.randomUUID(),
    remitente: item.es_bot ? "bot" : (item.remitente || "usuario"),
    texto: String(item.contenido ?? item.texto ?? ""),
    fecha: item.fecha || new Date().toISOString(),
    resultado: item.resultado || null,
    imagen: item.imagen || null,
    error: Boolean(item.error),
  };
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
            <strong>{item.nombre || item.medico || `Cita #${item.id}`}</strong>
            {item.especialidad && <span>{item.especialidad}</span>}
            {item.ciudad && <span>{item.ciudad}</span>}
            {item.fecha && <span>{fechaCorta(item.fecha)}</span>}
            {item.estado && <span className={styles.status}>{item.estado}</span>}
          </div>
        </article>
      ))}
    </div>
  );
}

function ContenidoMensaje({ mensaje }) {
  return (
    <>
      {mensaje.imagen && (
        <Image className={styles.messageImage} src={mensaje.imagen} alt="Imagen médica adjunta" width={280} height={180} unoptimized />
      )}
      <div className={styles.messageText}>
        {mensaje.texto.split("\n").map((linea, index) => (
          <span key={index}>{linea || "\u00a0"}</span>
        ))}
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
      <span className={styles.sender}>{bot ? "Bymax" : "Tú"}</span>
      <ContenidoMensaje mensaje={item}/>
      {streaming && !item.texto && <span className={styles.typing}><i/><i/><i/><span>Preparando tu respuesta…</span></span>}
      <div className={styles.messageFooter}>
        <time>{fechaCorta(item.fecha)}</time>
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
