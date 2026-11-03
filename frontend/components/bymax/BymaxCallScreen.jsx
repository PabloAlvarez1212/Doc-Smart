"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Keyboard, Menu, MessageSquareText, Mic, MicOff, Minus, PhoneOff, Send, Settings2, Stethoscope, WifiOff, X } from "lucide-react";
import BymaxCharacter from "./BymaxCharacter";
import styles from "./BymaxAssistant.module.css";

const BARRAS = Array.from({ length: 26 }, (_, index) => index);
const MAX_PALABRAS = 18;

// Cada palabra queda «dicha», «actual» (en el fragmento que suena) o «espera» (ya llegó, aún no se dice).
function palabrasConEstado(item, voice, generando) {
  const palabras = [];
  let acumulado = 0;
  for (const token of String(item?.texto || "").split(/\s+/).filter(Boolean)) {
    acumulado += token.length;
    palabras.push({ token, fin: acumulado });
  }
  let hecho = Infinity, actual = 0;
  if (voice.speechId === item.id) {
    hecho = String(voice.spokenText || "").replace(/\s+/g, "").length;
    actual = String(voice.speakingText || "").replace(/\s+/g, "").length;
  } else if (generando) { hecho = 0; }
  return palabras
    .map(({ token, fin }) => ({ texto: token.replace(/\*\*/g, ""), estado: fin <= hecho ? "dicha" : fin <= hecho + actual ? "actual" : "espera" }))
    .filter(({ texto }) => texto && !/^(?:[-*•]|\d+[.)])$/.test(texto));
}

const tieneDetalles = (item) => {
  const data = item?.resultado?.data || item?.resultado;
  return Boolean(item?.imagen) || Array.isArray(data?.medicos) || Array.isArray(data?.citas);
};

// El chat de Bymax: una sola pantalla para hablar (llamada continua) o escribir. El historial vive en el menú de tres rayas.
export default function BymaxCallScreen({ status, voice, messages, loading, sending, composer, modo, identity, sugerencias, connection, onReconnect,
  onMenu, onTranscript, onSettings, onMinimize, onClinical, dragHandlers, menuRef, settingsRef, minimizeRef }) {
  const [teclado, setTeclado] = useState(false);
  const [texto, setTexto] = useState("");
  const [segundos, setSegundos] = useState(0);
  const [lenta, setLenta] = useState(false);
  const silenciadoAntes = useRef(false);
  const inputRef = useRef(null);
  const llamando = voice.call;

  useEffect(() => {
    if (!llamando) { setSegundos(0); return; }
    const inicio = Date.now();
    const tick = () => setSegundos(Math.floor((Date.now() - inicio) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [llamando]);
  // El micrófono se reabre solo; solo si tarda más de unos segundos se avisa.
  useEffect(() => {
    setLenta(false);
    if (!llamando || voice.muted || voice.mic === "listening") return;
    const timer = setTimeout(() => setLenta(true), 2500);
    return () => clearTimeout(timer);
  }, [llamando, voice.muted, voice.mic]);
  // Sin reconocimiento de voz en el navegador, la llamada sigue: Bymax responde en voz alta y se escribe.
  useEffect(() => { if (llamando && voice.supported === false) setTeclado(true); }, [llamando, voice.supported]);

  const hayUsuario = messages.some(item => item.remitente !== "bot");
  const ultimoUsuario = hayUsuario ? messages.findLast(item => item.remitente !== "bot") : null;
  const ultimoBot = hayUsuario ? messages.findLast(item => item.remitente === "bot") : null;
  const error = composer.error || voice.error;
  const hablando = voice.playback === "speaking";
  const preparando = sending || loading || ["preparing", "starting"].includes(voice.playback);
  const parcial = llamando && !teclado && !voice.muted ? String(composer.message || "").trim() : "";
  const lineaUsuario = parcial || ultimoUsuario?.texto || "";
  const pensando = sending && !ultimoBot?.texto;

  let clave = "reposo", etiqueta = "Habla o escribe";
  if (error) { clave = "error"; etiqueta = "Necesito tu atención"; }
  else if (hablando) { clave = "hablando"; etiqueta = llamando ? "Hablando · puedes interrumpirme" : "Hablando…"; }
  else if (preparando) { clave = "pensando"; etiqueta = loading ? "Cargando conversación…" : "Pensando…"; }
  else if (teclado) { clave = "silencio"; etiqueta = llamando && voice.supported !== false ? "Escribiendo · micrófono en silencio" : "Escribe tu mensaje"; }
  else if (llamando && voice.muted) { clave = "silencio"; etiqueta = "Micrófono en silencio"; }
  else if (llamando && lenta) { etiqueta = "Reconectando la escucha…"; }
  else if (llamando) { clave = "oyendo"; etiqueta = parcial ? "Te escucho…" : "Te escucho"; }

  let pista = "Toca el micrófono para hablar o usa el teclado para escribir.";
  if (hablando) pista = llamando ? "Habla encima o toca a Bymax para interrumpirlo." : "Toca a Bymax para detener su voz.";
  else if (teclado) pista = voice.enabled ? "Escribe tu mensaje. Bymax te responde en voz alta." : "Escribe tu mensaje.";
  else if (llamando && voice.muted) pista = "Activa el micrófono para seguir hablando.";
  else if (llamando && !hayUsuario) pista = "Habla cuando quieras. Con audífonos se oye mejor.";
  else if (llamando) pista = "";

  const palabras = ultimoBot?.texto ? palabrasConEstado(ultimoBot, voice, sending) : [];
  const dichas = palabras.filter(({ estado }) => estado === "dicha").length;
  const desde = Math.max(0, Math.min(dichas - 5, palabras.length - MAX_PALABRAS));
  const visibles = palabras.slice(desde, desde + MAX_PALABRAS);

  const alternarTeclado = () => {
    if (!teclado) {
      silenciadoAntes.current = voice.muted;
      if (llamando && !voice.muted) voice.setMuted(true);
      setTeclado(true);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
    } else {
      if (llamando && !silenciadoAntes.current) voice.setMuted(false);
      setTeclado(false);
    }
  };
  const hablar = () => { setTeclado(false); voice.startCall(); };
  const interrumpir = () => {
    if (!(hablando || preparando)) return;
    if (llamando) voice.interrupt(); else composer.onCancel?.();
  };
  const enviar = (event) => {
    event.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje || composer.unavailable) return;
    composer.onSend(mensaje);
    setTexto("");
  };
  const tiempo = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  const inicio = !hayUsuario && !loading;
  return <section className={styles.callScreen} data-estado={clave} data-modo={modo} data-inicio={inicio || undefined} aria-label="Chat con Bymax">
    <div className={styles.callAuroraWrap} aria-hidden="true"><div className={styles.callAurora}/></div>
    <header className={styles.callTop} {...dragHandlers} title="Arrastra la cabecera para mover la ventana. Doble clic para restaurar.">
      <button ref={menuRef} type="button" onClick={onMenu} aria-label="Abrir conversaciones" aria-haspopup="dialog" title="Conversaciones"><Menu size={22}/></button>
      <span className={styles.callChip}><span>{etiqueta}</span></span>
      <span className={styles.callSpacer}/>
      {llamando && <time className={styles.callTime} aria-label="Duración de la llamada">{tiempo}</time>}
      {modo === "medico" && <button type="button" onClick={onClinical} aria-label="Abrir copiloto clínico" title="Copiloto clínico"><Stethoscope size={19}/></button>}
      <button ref={settingsRef} type="button" onClick={onSettings} aria-label="Configurar voz" title="Configurar voz"><Settings2 size={19}/></button>
      <button ref={minimizeRef} type="button" onClick={onMinimize} aria-label="Minimizar chat" title="Minimizar chat"><Minus size={21}/></button>
    </header>

    <div className={styles.callBody}>
    {connection === "disconnected" && <div className={styles.callError} role="status">
      <WifiOff size={17} aria-hidden="true"/><span>Se interrumpió la conexión en tiempo real.</span>
      <button type="button" className={styles.callTextButton} onClick={onReconnect} disabled={sending}>Reconectar</button>
    </div>}

    <div className={styles.callCenter}>
      <button type="button" className={styles.callAvatar} aria-label="Tocar para interrumpir a Bymax" onClick={interrumpir}>
        <span className={styles.callGlow} aria-hidden="true"/>
        <BymaxCharacter status={status}/>
      </button>
      {llamando && <span className={styles.callBars} aria-hidden="true">{BARRAS.map(index => <i key={index} style={{ "--i": index }}/>)}</span>}
    </div>

    <div className={styles.callCaptions} aria-live="polite">
      {inicio ? <div className={styles.callWelcome}>
        {identity?.saludo
          ? <p className={styles.callGreeting}>{identity.saludo}</p>
          : <><h2>Hola, soy {modo === "medico" ? "Bymax Médico" : "Bymax"}.</h2>
            <p>{modo === "medico" ? "Revisemos tus casos y preparemos borradores para tu valoración." : "Estoy aquí para orientarte y ayudarte a cuidar de ti."}</p></>}
        <p className={styles.callAsk}>{llamando ? "Habla cuando quieras o elige una opción:" : "¿Con qué te ayudo?"}</p>
        <div className={styles.suggestions}>
          {sugerencias.map((sugerencia, index) =>
            <button type="button" key={sugerencia} style={{ "--i": index }} disabled={composer.unavailable} onClick={() => composer.onSend(sugerencia)}>{sugerencia}</button>)}
        </div>
      </div> : <>
        {lineaUsuario && <p className={styles.callUser}>«{lineaUsuario}»</p>}
        {pensando
          ? <p className={styles.callBot}><span className={styles.typing}><i/><i/><i/></span></p>
          : visibles.length > 0 && <p className={styles.callBot}>
            {desde > 0 && "… "}
            {visibles.map(({ texto: palabra, estado }, index) => <span key={`${desde + index}`} className={styles.callWord} data-e={estado}>{palabra} </span>)}
            {ultimoBot?.cortado && <span className={styles.callCut}>Interrumpida</span>}
          </p>}
        {!pensando && tieneDetalles(ultimoBot) && <button type="button" className={styles.callMore} onClick={onTranscript}><MessageSquareText size={15}/> Ver detalles</button>}
      </>}
    </div>

    {error && <div className={styles.callError} role="alert"><AlertCircle size={18}/><span>{error}</span><button type="button" onClick={composer.clearError} aria-label="Cerrar aviso"><X size={18}/></button></div>}
    {composer.confirmation && <div className={styles.callConfirm} role="group" aria-label="Confirmar operación pendiente">
      <p>Revisa los datos y confirma con el botón. Por seguridad, no se confirma por voz.</p>
      <button type="button" disabled={sending} onClick={() => composer.onSend("Sí", true)}>Sí, confirmar</button>
      <button type="button" disabled={sending} onClick={() => composer.onSend("No", true)}>No, cancelar</button>
      <button type="button" onClick={onTranscript}>Ver datos</button>
    </div>}
    </div>

    <div className={styles.callBottom}>
      {teclado && <form className={styles.callForm} onSubmit={enviar}>
        <input ref={inputRef} type="text" value={texto} onChange={event => setTexto(event.target.value)} placeholder="Escribe tu mensaje…" aria-label="Mensaje para Bymax" autoComplete="off" enterKeyHint="send"/>
        <button type="submit" disabled={!texto.trim() || composer.unavailable} aria-label="Enviar mensaje"><Send size={19}/></button>
      </form>}
      <div className={styles.callControls}>
        {llamando && <button type="button" aria-pressed={voice.muted && !teclado} aria-label={voice.muted ? "Activar micrófono" : "Silenciar micrófono"} disabled={teclado || voice.supported === false} onClick={() => voice.setMuted(!voice.muted)}>{voice.muted ? <MicOff size={24}/> : <Mic size={24}/>}</button>}
        <button type="button" aria-pressed={teclado} aria-label={teclado ? "Dejar de escribir" : "Escribir en lugar de hablar"} onClick={alternarTeclado}><Keyboard size={24}/></button>
        {llamando
          ? <button type="button" className={styles.callHang} aria-label="Terminar la llamada" onClick={voice.endCall}><PhoneOff size={26}/></button>
          : <button type="button" className={styles.callTalk} aria-label="Hablar con Bymax por voz" disabled={composer.unavailable} onClick={hablar}><Mic size={28}/></button>}
        <button type="button" aria-label="Ver la conversación completa" title="Ver la conversación completa" onClick={onTranscript}><MessageSquareText size={24}/></button>
      </div>
      <p className={styles.callHint}>{pista}</p>
    </div>
  </section>;
}
