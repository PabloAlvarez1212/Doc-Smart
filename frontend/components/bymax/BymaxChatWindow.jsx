"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AudioLines, Check, ChevronDown, Menu, Mic, Minus, Play, Plus, Settings2, ShieldCheck, Square, Trash2, Volume2, VolumeX, X } from "lucide-react";
import BymaxMessage from "./BymaxMessage";
import BymaxComposer from "./BymaxComposer";
import { DEFAULT_VOICE } from "./bymaxVoiceController.mjs";
import styles from "./BymaxAssistant.module.css";

export default function BymaxChatWindow({ open, close, status, label, chats, chatId, messages, loading, sending, streamingId, sidebar, setSidebar, loadChat, newChat, deleteChat, voice, viewportStyle, composer }) {
  const [present, setPresent] = useState(open);
  const [settings, setSettings] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const panelRef = useRef(null);
  const scrollRef = useRef(null);
  const closeRef = useRef(null);
  const settingsRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const historyRef = useRef(null);
  const historyButtonRef = useRef(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const resetDrawer = () => { if (desktop.matches) setSidebar(false); };
    desktop.addEventListener("change", resetDrawer);
    return () => desktop.removeEventListener("change", resetDrawer);
  }, [setSidebar]);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    setSettings(false);
    const timeout = setTimeout(() => setPresent(false), 180);
    return () => clearTimeout(timeout);
  }, [open]);
  useEffect(() => {
    if (!open || !present) return;
    // Focus a control, not the input: opening the assistant must not summon the mobile keyboard.
    closeRef.current?.focus({ preventScroll: true });
  }, [open, present]);
  useEffect(() => {
    const element = scrollRef.current;
    if (open && atBottom && element) element.scrollTop = element.scrollHeight;
  }, [messages, sending, open, atBottom, viewportStyle]);
  useEffect(() => { setAtBottom(true); }, [chatId]);
  useEffect(() => { if (settings) settingsRef.current?.querySelector("button")?.focus(); }, [settings]);
  useEffect(() => { if (sidebar) historyRef.current?.querySelector("button")?.focus(); }, [sidebar]);
  const closeSettings = () => { setSettings(false); settingsButtonRef.current?.focus(); };
  const closeHistory = () => { setSidebar(false); historyButtonRef.current?.focus(); };
  function keyboard(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (settings) closeSettings(); else if (sidebar) closeHistory(); else close();
    }
    if (event.key !== "Tab") return;
    const scope = settings ? settingsRef.current : sidebar ? historyRef.current : panelRef.current;
    const elements = Array.from(scope.querySelectorAll('button:not([disabled]), textarea, input:not([hidden]), select, [tabindex="0"]'))
      .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (!present) return null;
  const playing = ["speaking", "starting", "preparing", "ready"].includes(voice.playback);
  return <section id="bymax-chat" ref={panelRef} role="dialog" aria-label="Chat con Bymax" inert={!open} onKeyDown={keyboard}
    className={`${styles.shell} ${!open ? styles.closing : ""}`} style={viewportStyle} data-state={status}>
    {sidebar && <button type="button" className={styles.backdrop} aria-label="Cerrar historial" onClick={closeHistory}/>}
    <aside ref={historyRef} className={`${styles.sidebar} ${sidebar ? styles.sidebarOpen : ""}`} aria-label="Historial de Bymax" inert={settings}>
      <div className={styles.brand}><Image src="/icons/asistente_bymax.png" alt="" width={42} height={42}/><div><strong>Bymax</strong><small>Tu asistente de salud</small></div><button type="button" className={styles.historyClose} onClick={closeHistory} aria-label="Cerrar historial de Bymax"><X size={20}/></button></div>
      <button type="button" className={styles.newChat} onClick={newChat} disabled={loading}><Plus size={18}/> Nueva conversación</button>
      <p className={styles.historyTitle}>TUS CONVERSACIONES</p>
      <nav className={styles.history} aria-label="Conversaciones">
        {chats.map(chat => <div className={`${styles.chatItem} ${chat.id === chatId ? styles.chatActive : ""}`} key={chat.id}>
          <button type="button" onClick={() => loadChat(chat.id)} aria-current={chat.id === chatId ? "page" : undefined}><strong>{chat.titulo || "Nueva conversación"}</strong><small>{chat.ultima_interaccion || chat.fecha ? new Date(chat.ultima_interaccion || chat.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "Ahora"}</small></button>
          <button type="button" className={styles.deleteChat} onClick={event => deleteChat(chat.id, event)} aria-label={`Eliminar ${chat.titulo || "conversación"}`}><Trash2 size={16}/></button>
        </div>)}
      </nav>
      <p className={styles.privacy}><ShieldCheck size={16}/><span>Un espacio para tus consultas, vinculado a tu sesión.</span></p>
    </aside>
    <section className={styles.chatPanel} inert={settings || sidebar}>
      <header className={styles.header}>
        <button ref={historyButtonRef} type="button" className={styles.mobileMenu} onClick={() => setSidebar(true)} aria-label="Abrir historial" aria-expanded={sidebar}><Menu size={21}/></button>
        <div className={styles.assistant}><Image className={styles.avatar} src="/icons/asistente_bymax.png" alt="" width={48} height={48}/><div><strong>Bymax</strong><small role="status"><span className={styles.stateMark}/>{label}</small></div></div>
        <div className={styles.headerActions}>
          <button ref={settingsButtonRef} type="button" onClick={() => setSettings(true)} aria-label="Configurar voz" title="Configurar voz"><Settings2 size={19}/></button>
          <button type="button" className={voice.enabled ? styles.activeAction : ""} onClick={() => voice.setEnabled(!voice.enabled)} aria-pressed={voice.enabled} aria-label={voice.enabled ? "Desactivar respuestas por voz" : "Activar respuestas por voz"} title="Respuestas por voz">{voice.enabled ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button>
          <button ref={closeRef} type="button" onClick={close} aria-label="Minimizar chat" title="Minimizar chat"><Minus size={21}/></button>
        </div>
      </header>
      <div className={styles.conversation}>
        <div className={styles.messages} ref={scrollRef} role="log" aria-label="Mensajes de la conversación" aria-live="polite" aria-relevant="additions" aria-busy={sending}
          onScroll={event => { const element = event.currentTarget; setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 64); }}>
          {loading ? <div className={styles.loading} role="status"><span className={styles.typing}><i/><i/><i/></span>Cargando conversación…</div> : <>
            {messages.length <= 1 && <div className={styles.welcome}><Image src="/icons/asistente_bymax.png" alt="Bymax" width={96} height={96}/><span>UN POCO DE AYUDA, CUANDO LA NECESITAS</span><h2>Hola, soy Bymax.</h2><p>Estoy aquí para orientarte y ayudarte a cuidar de ti.</p></div>}
            {messages.map(item => <BymaxMessage key={item.id} item={item} voice={voice} streaming={item.id === streamingId && sending}/>)}
            {sending && !streamingId && <div className={styles.loading} role="status"><span className={styles.typing}><i/><i/><i/></span>Bymax está preparando una respuesta…</div>}
          </>}
        </div>
        {!atBottom && <button type="button" className={styles.latest} onClick={() => setAtBottom(true)}><ChevronDown size={16}/> Ir al último mensaje</button>}
      </div>
      <BymaxComposer {...composer} sending={sending} voice={voice}/>
    </section>
    {settings && <div className={styles.voiceOverlay} onClick={closeSettings}>
      <section ref={settingsRef} className={styles.voicePanel} role="dialog" aria-modal="true" aria-labelledby="bymax-voice-title" onClick={event => event.stopPropagation()}>
        <div className={styles.voicePanelHeader}><div><span className={styles.voiceIdentity}><AudioLines size={16}/> A TU RITMO</span><h2 id="bymax-voice-title">Voz de Bymax</h2></div><button type="button" onClick={closeSettings} aria-label="Cerrar configuración de voz"><X size={20}/></button></div>
        <p className={styles.voiceIntro}>Minimizar el chat mantiene la sesión de voz. Para dejar de escuchar, desactiva el micrófono o termina la conversación.</p>
        <button type="button" className={styles.voiceToggle} role="switch" aria-checked={voice.enabled} onClick={() => voice.setEnabled(!voice.enabled)}>Respuestas por voz: {voice.enabled ? "ON" : "OFF"}</button>
        <label className={styles.voiceField}><span>Voz del asistente</span><select value={voice.config.motor === "neural" ? "__neural__" : voice.config.voiceURI} onChange={event => voice.updateConfig(event.target.value === "__neural__" ? { motor: "neural" } : { motor: "browser", voiceURI: event.target.value })}>
          <option value="__neural__">Bymax Neural · ElevenLabs</option><option value="">Voz en español del dispositivo</option>{voice.voices.map(item => <option key={item.voiceURI} value={item.voiceURI}>{item.name} · {item.lang}</option>)}
        </select></label>
        {[{key:"rate",label:"Velocidad",min:.75,max:1.2},{key:"pitch",label:"Tono · voz del dispositivo",min:.75,max:1.3},{key:"volume",label:"Volumen",min:.2,max:1}].map(field => <label className={styles.voiceRange} key={field.key}><span>{field.label}<output>{Number(voice.config[field.key]).toFixed(2)}</output></span><input type="range" min={field.min} max={field.max} step="0.01" value={voice.config[field.key]} onChange={event => voice.updateConfig({ [field.key]: Number(event.target.value) })}/></label>)}
        <div className={styles.voiceActions}><button type="button" onClick={() => voice.updateConfig(DEFAULT_VOICE)}>Restaurar</button><button type="button" className={styles.primaryButton} onClick={() => playing && voice.messageId === "voice-test" && voice.playback !== "ready" ? voice.stopPlayback() : voice.play("Hola, soy Bymax. Estoy aquí para acompañarte y ayudarte con tu salud.", "voice-test")}>{playing && voice.messageId === "voice-test" && voice.playback !== "ready" ? <Square size={16}/> : <Play size={16}/>} {voice.messageId === "voice-test" && voice.playback === "ready" ? "Reproducir" : playing && voice.messageId === "voice-test" ? "Detener" : "Probar voz"}</button></div>
        <p className={styles.voiceNote} role="status">{voice.error || voice.notice || "La disponibilidad depende del navegador, sus permisos y las voces del dispositivo."}</p>
        <div className={styles.wakeOption}><Mic size={19}/><div><strong>Activación por «Bymax»</strong><p>Espera tu indicación y vuelve a esperar después de responder. Puede suspenderse al ocultar la página o bloquear el teléfono.</p></div><button type="button" onClick={() => { if (voice.active) voice.stopListening(); else voice.startListening("wake"); closeSettings(); }}>{voice.active ? "Desactivar" : "Activar"}</button></div>
        <p className={styles.voiceNote}>El reconocimiento puede usar servicios del navegador para transcribir audio. Las conversaciones sin «Bymax» no se envían al backend de DocSmart. Mientras Bymax habla, usa Terminar conversación para interrumpirlo: el micrófono se pausa para evitar que escuche su propia voz.</p>
      </section>
    </div>}
  </section>;
}
