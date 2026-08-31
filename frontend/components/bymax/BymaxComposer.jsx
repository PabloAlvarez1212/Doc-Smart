"use client";
import { useEffect } from "react";
import Image from "next/image";
import { ImagePlus, Mic, Square, Send, X, AlertCircle } from "lucide-react";
import styles from "./BymaxAssistant.module.css";
export default function BymaxComposer({ message, setMessage, image, setImage, error, clearError, sending, voice, onSend, onImage, inputRef, fileRef, confirmation }) {
  const listening = voice.active;
  useEffect(() => {
    const input = inputRef.current;
    if (input) { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 112)}px`; }
  }, [message, inputRef]);
  return <footer className={styles.composerArea}>
    <div className={styles.sessionControls}>
      <button type="button" aria-pressed={voice.active} onClick={() => voice.active ? voice.stopListening() : voice.startListening("wake")}>
        <Mic size={16}/>{voice.active ? "Desactivar micrófono" : "Activar asistente de voz"}
      </button>
      {voice.active && <button type="button" onClick={voice.endConversation}><Square size={16}/>Terminar conversación</button>}
      {voice.playback === "ready" && <button type="button" onClick={() => voice.play("", voice.messageId)}>Reproducir audio listo</button>}
    </div>
    {!voice.active && voice.mic !== "ended" && <p className={styles.voiceNotice}>Activa el micrófono para esperar «Bymax». El navegador puede pedir permiso.</p>}
    {(error || voice.error) && <div className={styles.errorBanner} role="alert"><AlertCircle size={18}/><span>{error || voice.error}</span><button type="button" onClick={clearError} aria-label="Cerrar aviso"><X size={18}/></button></div>}
    {voice.notice && !voice.error && <p className={styles.voiceNotice} role="status">{voice.notice}</p>}
    {confirmation && !sending && <div className={styles.quickReplies}><button type="button" onClick={() => onSend("Sí, confirmo")}>Sí, confirmar</button><button type="button" onClick={() => onSend("No, cancelar")}>No, cancelar</button></div>}
    {image && <div className={styles.preview}><Image src={image.preview} alt="Imagen adjunta" width={56} height={48} unoptimized/><span>{image.file.name}<small>Imagen médica · {(image.file.size / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" onClick={() => setImage(null)} aria-label="Quitar imagen"><X size={18}/></button></div>}
    <div className={styles.composer}>
      <button type="button" onClick={() => fileRef.current?.click()} aria-label="Adjuntar imagen médica" title="Adjuntar imagen"><ImagePlus size={21}/></button>
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage}/>
      <textarea ref={inputRef} value={message} rows={1} placeholder="Escribe tu consulta…" aria-label="Mensaje para Bymax" onChange={e => setMessage(e.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) { event.preventDefault(); onSend(); } }}/>
      <button type="button" className={listening ? styles.micActive : ""} disabled={sending && !listening}
        aria-label={listening ? "Detener micrófono" : "Hablar con Bymax"} aria-pressed={listening}
        title={listening ? "Detener micrófono" : "Hablar con Bymax"}
        onClick={() => { if (listening) voice.stopListening(); else voice.startListening("dictation"); }}>
        {listening ? <Square size={19}/> : <Mic size={21}/>}
      </button>
      <button type="button" className={styles.send} disabled={sending || (!message.trim() && !image)} onClick={() => onSend()} aria-label="Enviar mensaje"><Send size={20}/></button>
    </div>
    <p className={styles.disclaimer}>Orientación general. No reemplaza una valoración médica.</p>
  </footer>;
}
