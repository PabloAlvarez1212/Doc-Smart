"use client";
import { useEffect } from "react";
import Image from "next/image";
import { ImagePlus, Send, X, AlertCircle, LoaderCircle, CalendarCheck, Play } from "lucide-react";
import styles from "./BymaxAssistant.module.css";
export default function BymaxComposer({ message, setMessage, image, setImage, error, clearError, sending, voice, onSend, onImage, inputRef, fileRef, confirmation, unavailable }) {
  useEffect(() => {
    const input = inputRef.current;
    if (input) { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 112)}px`; }
  }, [message, inputRef]);
  return <footer className={styles.composerArea}>
    {confirmation && <div className={styles.confirmation} role="group" aria-label="Confirmar operación pendiente">
      <p><CalendarCheck size={18} aria-hidden="true"/> Revisa los datos de la solicitud antes de confirmar.</p>
      <button type="button" disabled={sending} onClick={() => onSend("Sí", true)}>Sí, confirmar</button>
      <button type="button" disabled={sending} onClick={() => onSend("No", true)}>No, cancelar</button>
    </div>}
    {voice.playback === "ready" && <button type="button" className={styles.audioReady} onClick={() => voice.play("", voice.messageId)}><Play size={16}/> Reproducir audio listo</button>}
    {!voice.enabled && <p className={styles.voiceNotice}>Puedes activar la voz en Configuración.</p>}
    {(error || voice.error) && <div className={styles.errorBanner} role="alert"><AlertCircle size={18}/><span>{error || voice.error}</span><button type="button" onClick={clearError} aria-label="Cerrar aviso"><X size={18}/></button></div>}
    {voice.notice && !voice.error && <p className={styles.voiceNotice} role="status">{voice.notice}</p>}
    {image && <div className={styles.preview}><Image src={image.preview} alt="Imagen adjunta" width={56} height={48} unoptimized/><span>{image.file.name}<small>Imagen médica · {(image.file.size / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" onClick={() => setImage(null)} aria-label="Quitar imagen"><X size={18}/></button></div>}
    <div className={styles.composer}>
      <button type="button" disabled={unavailable} onClick={() => fileRef.current?.click()} aria-label="Adjuntar imagen médica" title="Adjuntar imagen"><ImagePlus size={21}/></button>
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage}/>
      <textarea ref={inputRef} value={message} rows={1} placeholder="Escribe tu consulta…" aria-label="Mensaje para Bymax" onChange={e => setMessage(e.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) { event.preventDefault(); onSend(); } }}/>
      <button type="button" className={styles.send} disabled={unavailable || sending || (!message.trim() && !image)} onClick={() => onSend()} aria-label={sending ? "Enviando mensaje" : "Enviar mensaje"}>{sending ? <LoaderCircle className={styles.spin} size={20}/> : <Send size={20}/>}</button>
    </div>
    <p className={styles.disclaimer}>Orientación general. No reemplaza una valoración médica.</p>
  </footer>;
}
