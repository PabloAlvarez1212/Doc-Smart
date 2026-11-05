"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AudioLines, ChevronDown, ChevronLeft, MessageCircle, MessagesSquare, Phone, PhoneOff, Play, Plus, ShieldCheck, Square, Trash2, WifiOff, X } from "lucide-react";
import BymaxMessage from "./BymaxMessage";
import BymaxComposer from "./BymaxComposer";
import BymaxCallScreen from "./BymaxCallScreen";
import useDraggableBymaxWindow from "./useDraggableBymaxWindow";
import { DEFAULT_VOICE } from "./bymaxVoiceController.mjs";
import styles from "./BymaxAssistant.module.css";

const SUGERENCIAS = {
  paciente: ["¿Cuándo es mi próxima cita?", "Quiero buscar un médico", "Tengo un síntoma y quiero orientación", "Quiero agendar una cita"],
  medico: ["¿Qué citas tengo hoy?", "¿Tengo solicitudes por confirmar?", "Ayúdame a resumir una consulta", "Redacta indicaciones generales"],
};

export default function BymaxChatWindow({ open, close, status, label, chats, chatId, messages, loading, sending, streamingId, sidebar, setSidebar, loadChat, newChat, deleteChat, voice, viewportStyle, composer, connection, reconnect, modo = "paciente", onOpenClinical, identity }) {
  const [present, setPresent] = useState(open);
  const [settings, setSettings] = useState(false);
  // La pantalla principal es la de Bymax (hablar o escribir); la conversación completa se abre encima.
  const [transcript, setTranscript] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const wasSending = useRef(false);
  useEffect(() => {
    if (sending) setAnnouncement("");
    else if (wasSending.current) setAnnouncement("Respuesta de Bymax disponible al final de la conversación.");
    wasSending.current = sending;
  }, [sending]);
  const panelRef = useRef(null);
  const draggable = useDraggableBymaxWindow(panelRef, open && present);
  const scrollRef = useRef(null);
  const minimizeRef = useRef(null);
  const settingsRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const historyRef = useRef(null);
  const historyButtonRef = useRef(null);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    setSettings(false);
    setTranscript(false);
    const timeout = setTimeout(() => setPresent(false), 180);
    return () => clearTimeout(timeout);
  }, [open]);
  useEffect(() => {
    if (!open || !present) return;
    // Focus a control, not the input: opening the assistant must not summon the mobile keyboard.
    minimizeRef.current?.focus({ preventScroll: true });
  }, [open, present]);
  useEffect(() => {
    const element = scrollRef.current;
    if (open && atBottom && element) element.scrollTop = element.scrollHeight;
  }, [messages, sending, open, atBottom, viewportStyle, transcript]);
  useEffect(() => { setAtBottom(true); }, [chatId]);
  useEffect(() => { if (settings) settingsRef.current?.querySelector("button")?.focus(); }, [settings]);
  useEffect(() => { if (sidebar) historyRef.current?.querySelector("button")?.focus(); }, [sidebar]);
  const closeSettings = () => { setSettings(false); settingsButtonRef.current?.focus(); };
  const closeHistory = () => { setSidebar(false); historyButtonRef.current?.focus(); };
  // Minimizar la ventana también cuelga: una llamada no debe seguir en segundo plano sin verse.
  const closeAll = () => { if (voice.call) voice.endCall(); close(); };
  function keyboard(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (settings) closeSettings(); else if (sidebar) closeHistory(); else if (transcript) setTranscript(false); else closeAll();
    }
    if (event.key !== "Tab") return;
    const scope = settings ? settingsRef.current : sidebar ? historyRef.current : panelRef.current;
    const elements = Array.from(scope.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([hidden]):not([disabled]), select, [tabindex="0"]'))
      .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (!present) return null;
  const playing = ["speaking", "starting", "preparing", "ready"].includes(voice.playback);
  return <section id="bymax-chat" ref={panelRef} role="dialog" aria-label="Chat con Bymax" inert={!open} onKeyDown={keyboard}
    className={`${styles.shell} ${!open ? styles.closing : ""}`} style={{ ...viewportStyle, ...draggable.style }} data-state={status}>
    {sidebar && <button type="button" className={styles.backdrop} aria-label="Cerrar historial" onClick={closeHistory}/>}
    <aside ref={historyRef} className={`${styles.sidebar} ${sidebar ? styles.sidebarOpen : ""}`} aria-label="Historial de Bymax" inert={settings || !sidebar}>
      <div className={styles.brand}><Image src="/icons/asistente_bymax.png" alt="" width={42} height={42}/><div><strong>Bymax</strong><small>Tu asistente de salud</small></div><button type="button" className={styles.historyClose} onClick={closeHistory} aria-label="Cerrar historial de Bymax"><X size={20}/></button></div>
      <button type="button" className={styles.newChat} onClick={newChat} disabled={loading}><Plus size={18}/> Nueva conversación</button>
      <p className={styles.historyTitle}>Tus conversaciones{chats.length > 0 && <span>{chats.length}</span>}</p>
      <nav className={styles.history} aria-label="Conversaciones">
        {!chats.length && <div className={styles.historyEmpty}><span aria-hidden="true"><MessagesSquare size={22}/></span><p>{loading ? "Cargando historial…" : "Tus conversaciones aparecerán aquí. Crea una para comenzar."}</p></div>}
        {chats.map(chat => <div className={`${styles.chatItem} ${chat.id === chatId ? styles.chatActive : ""}`} key={chat.id}>
          <button type="button" onClick={() => loadChat(chat.id)} aria-current={chat.id === chatId ? "page" : undefined}><span className={styles.chatIcon} aria-hidden="true"><MessageCircle size={16}/></span><span className={styles.chatText}><strong>{chat.titulo || "Nueva conversación"}</strong><small>{chat.ultima_interaccion || chat.fecha ? new Date(chat.ultima_interaccion || chat.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "Ahora"}</small></span></button>
          <button type="button" className={styles.deleteChat} onClick={event => deleteChat(chat.id, event)} aria-label={`Eliminar ${chat.titulo || "conversación"}`}><Trash2 size={16}/></button>
        </div>)}
      </nav>
      <p className={styles.privacy}><ShieldCheck size={16}/><span>Un espacio para tus consultas, vinculado a tu sesión.</span></p>
    </aside>
    <section className={styles.chatPanel} inert={settings || sidebar}>
      <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{open ? `${label}. ${announcement}` : ""}</span>
      <BymaxCallScreen status={status} voice={voice} messages={messages} loading={loading} sending={sending} composer={composer} modo={modo} identity={identity}
        sugerencias={SUGERENCIAS[modo] || SUGERENCIAS.paciente} connection={connection} onReconnect={reconnect}
        onMenu={() => setSidebar(true)} onTranscript={() => setTranscript(true)} onSettings={() => setSettings(true)} onMinimize={closeAll} onClinical={onOpenClinical}
        dragHandlers={draggable.handlers} menuRef={historyButtonRef} settingsRef={settingsButtonRef} minimizeRef={minimizeRef}/>
      {transcript && <div className={styles.transcript} role="region" aria-label="Conversación completa">
        <header className={styles.transcriptHeader}>
          <button type="button" onClick={() => setTranscript(false)} aria-label="Volver a Bymax"><ChevronLeft size={22}/></button>
          <strong>Conversación</strong>
        </header>
        {connection === "disconnected" && <div className={styles.connectionBanner}>
          <WifiOff size={17} aria-hidden="true"/><span>Se interrumpió la conexión en tiempo real. Puedes intentar enviar por la conexión alternativa.</span>
          <button type="button" onClick={reconnect} disabled={sending}>Reconectar</button>
        </div>}
        {connection === "connecting" && <p className={styles.connectionPending}>Conectando en tiempo real…</p>}
        <div className={styles.conversation}>
          <div
            className={styles.messages}
            ref={scrollRef}
            role="log"
            aria-label="Mensajes de la conversación"
            aria-live="off"
            aria-relevant="additions"
            aria-busy={sending}
            onScroll={(event) => {
              const element = event.currentTarget;
              setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 64);
            }}
          >
            {loading ? (
              <div className={styles.loading} role="status">
                <span className={styles.typing}><i /><i /><i /></span>
                Cargando conversación…
              </div>
            ) : (
              <>
                {messages.map((item) => (
                  <BymaxMessage key={item.id} item={item} voice={voice} streaming={item.id === streamingId && sending}/>
                ))}
                {sending && !streamingId && (
                  <div className={styles.loading} role="status">
                    <span className={styles.typing}><i /><i /><i /></span>
                    Bymax está preparando una respuesta…
                  </div>
                )}
              </>
            )}
          </div>
          {!atBottom && <button type="button" className={styles.latest} onClick={() => setAtBottom(true)}><ChevronDown size={16}/> Ir al último mensaje</button>}
        </div>
        {voice.call && <div className={styles.callBar} role="status">
          <span><i className={styles.callDot} aria-hidden="true"/>En llamada con Bymax</span>
          <button type="button" onClick={() => setTranscript(false)}><Phone size={15}/> Volver a la llamada</button>
          <button type="button" onClick={voice.endCall} aria-label="Terminar la llamada"><PhoneOff size={15}/></button>
        </div>}
        <BymaxComposer {...composer} sending={sending} voice={voice}/>
      </div>}
    </section>
    {settings && <div className={styles.voiceOverlay} onClick={closeSettings}>
      <section ref={settingsRef} className={styles.voicePanel} role="dialog" aria-modal="true" aria-labelledby="bymax-voice-title" onClick={event => event.stopPropagation()}>
        <div className={styles.voicePanelHeader}><div><span className={styles.voiceIdentity}><AudioLines size={16}/> A TU RITMO</span><h2 id="bymax-voice-title">Voz de Bymax</h2></div><button type="button" onClick={closeSettings} aria-label="Cerrar configuración de voz"><X size={20}/></button></div>
        <p className={styles.voiceIntro}>Toca el micrófono de la pantalla de Bymax para hablar sin botones. También puedes activar o desactivar la voz desde Configuración de tu cuenta. Di «terminar conversación» para colgar.</p>
        <label className={styles.voiceField}><span>Voz del asistente</span><select value={voice.config.motor === "neural" ? "__neural__" : voice.config.voiceURI} onChange={event => voice.updateConfig(event.target.value === "__neural__" ? { motor: "neural" } : { motor: "browser", voiceURI: event.target.value })}>
          <option value="__neural__">Bymax Neural · ElevenLabs</option><option value="">Voz en español del dispositivo</option>{voice.voices.map(item => <option key={item.voiceURI} value={item.voiceURI}>{item.name} · {item.lang}</option>)}
        </select></label>
        {[{key:"rate",label:"Velocidad",min:.75,max:1.2},{key:"pitch",label:"Tono · voz del dispositivo",min:.75,max:1.3},{key:"volume",label:"Volumen",min:.2,max:1}].map(field => <label className={styles.voiceRange} key={field.key}><span>{field.label}<output>{Number(voice.config[field.key]).toFixed(2)}</output></span><input type="range" min={field.min} max={field.max} step="0.01" value={voice.config[field.key]} onChange={event => voice.updateConfig({ [field.key]: Number(event.target.value) })}/></label>)}
        <label className={styles.voiceField}><span>Pausa antes de enviar tu dictado</span><select value={voice.config.silencio ?? 1600} onChange={event => voice.updateConfig({ silencio: Number(event.target.value) })}><option value={1200}>Corta · 1,2 s</option><option value={1600}>Normal · 1,6 s</option><option value={2400}>Larga · 2,4 s</option></select></label>
        <div className={styles.voiceActions}><button type="button" onClick={() => voice.updateConfig(DEFAULT_VOICE)}>Restaurar</button><button type="button" className={styles.primaryButton} onClick={() => playing && voice.messageId === "voice-test" && voice.playback !== "ready" ? voice.stopPlayback() : voice.play("Hola, soy Bymax. Estoy aquí para acompañarte y ayudarte con tu salud.", "voice-test")}>{playing && voice.messageId === "voice-test" && voice.playback !== "ready" ? <Square size={16}/> : <Play size={16}/>} {voice.messageId === "voice-test" && voice.playback === "ready" ? "Reproducir" : playing && voice.messageId === "voice-test" ? "Detener" : "Probar voz"}</button></div>
        <p className={styles.voiceNote} role="status">{voice.error || voice.notice || "La disponibilidad depende del navegador, sus permisos y las voces del dispositivo."}</p>
        <p className={styles.voiceNote}>El reconocimiento puede usar servicios del navegador para transcribir audio. En una llamada el micrófono sigue abierto mientras Bymax habla, para que puedas interrumpirlo; con audífonos funciona mejor. Puedes detener toda la voz desde Configuración.</p>
      </section>
    </div>}
  </section>;
}
