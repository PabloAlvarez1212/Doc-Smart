"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, CalendarDays, Check, ChevronLeft, ImagePlus, Languages,
  Menu, Mic, MicOff, Plus, Send, Stethoscope, Trash2, Volume2,
  VolumeX, X,
} from "lucide-react";
import { bymaxService } from "@/app/services/bymaxServices";
import styles from "./ChatBot.module.css";

const SALUDO = "Hola 👋 Soy Bymax. ¿En qué puedo ayudarte hoy?";

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

export default function ChatBot() {
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [vozActiva, setVozActiva] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [error, setError] = useState("");
  const finalRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, enviando]);

  useEffect(() => {
    const overflowHtml = document.documentElement.style.overflow;
    const overflowBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = overflowHtml;
      document.body.style.overflow = overflowBody;
    };
  }, []);

  const cargarChat = useCallback(async (id) => {
    setCargando(true);
    setError("");
    try {
      const data = await bymaxService.obtenerMensajes(id);
      setChatId(id);
      setMensajes(data.length ? data.map(normalizarMensaje) : [normalizarMensaje({ remitente: "bot", texto: SALUDO })]);
      setSidebar(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  const nuevoChat = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const nuevo = await bymaxService.iniciarChat();
      setChats((prev) => [nuevo, ...prev.filter((chat) => chat.id !== nuevo.id)]);
      setChatId(nuevo.id);
      setMensajes([normalizarMensaje({ remitente: "bot", texto: SALUDO })]);
      setSidebar(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let activo = true;
    (async () => {
      try {
        const lista = await bymaxService.listarChats();
        if (!activo) return;
        setChats(lista);
        if (lista.length) await cargarChat(lista[0].id);
        else await nuevoChat();
      } catch (e) {
        if (activo) { setError(e.message); setCargando(false); }
      }
    })();
    return () => { activo = false; };
  }, [cargarChat, nuevoChat]);

  const hablar = useCallback((texto) => {
    if (!vozActiva || !window.speechSynthesis || !texto) return;
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = navigator.language || "es-CO";
    window.speechSynthesis.speak(voz);
  }, [vozActiva]);

  const enviarTexto = useCallback(async (textoForzado) => {
    const texto = String(textoForzado ?? mensaje).trim();
    if ((!texto && !imagen) || enviando || !chatId) return;
    const preview = imagen?.preview || null;
    const archivo = imagen?.file || null;
    const temporal = normalizarMensaje({ remitente: "usuario", texto: texto || "Analiza esta imagen médica.", imagen: preview });
    setMensajes((prev) => [...prev, temporal]);
    setMensaje("");
    setImagen(null);
    setEnviando(true);
    setError("");
    try {
      const respuesta = await bymaxService.enviarMensaje(chatId, temporal.texto, archivo);
      const bot = normalizarMensaje({ remitente: "bot", texto: respuesta.respuesta, resultado: respuesta.resultado });
      setMensajes((prev) => [...prev, bot]);
      hablar(bot.texto);
      setChats((prev) => prev.map((chat) => chat.id === chatId ? { ...chat, ultima_interaccion: new Date().toISOString() } : chat));
    } catch (e) {
      setMensajes((prev) => [...prev, normalizarMensaje({ remitente: "bot", texto: e.message, error: true })]);
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  }, [chatId, enviando, hablar, imagen, mensaje]);

  const alternarMicrofono = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Tu navegador no admite reconocimiento de voz. Usa Chrome o Edge actualizado."); return; }
    if (escuchando) { recognitionRef.current?.stop(); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || "es-CO";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setEscuchando(true);
    recognition.onend = () => setEscuchando(false);
    recognition.onerror = () => setEscuchando(false);
    recognition.onresult = (event) => {
      const texto = Array.from(event.results).map((r) => r[0].transcript).join(" ").trim();
      const comando = texto.replace(/^.*?\bbymax\b[,:]?\s*/i, "");
      setMensaje(comando || texto);
      const ultimo = event.results[event.results.length - 1];
      if (ultimo.isFinal && /\bbymax\b/i.test(texto) && comando) {
        recognition.stop();
        enviarTexto(comando);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const seleccionarImagen = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setError("Selecciona una imagen JPG, PNG o WEBP de máximo 8 MB.");
      return;
    }
    setImagen({ file, preview: URL.createObjectURL(file) });
    setError("");
  };

  const eliminarChat = async (id, event) => {
    event.stopPropagation();
    if (!window.confirm("¿Eliminar esta conversación?")) return;
    await bymaxService.eliminarChat(id);
    const restantes = chats.filter((chat) => chat.id !== id);
    setChats(restantes);
    if (id === chatId) restantes.length ? cargarChat(restantes[0].id) : nuevoChat();
  };

  const ultimaPregunta = mensajes.at(-1)?.remitente === "bot" && /\?|confirm/i.test(mensajes.at(-1)?.texto || "");

  return (
    <main className={styles.shell}>
      {sidebar && <button className={styles.backdrop} aria-label="Cerrar historial" onClick={() => setSidebar(false)} />}
      <aside className={`${styles.sidebar} ${sidebar ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}><span className={styles.brandIcon}><Bot size={24} /></span><div><strong>Bymax</strong><small>Asistente DocSmart</small></div></div>
        <button className={styles.newChat} onClick={nuevoChat}><Plus size={18} /> Nueva conversación</button>
        <div className={styles.historyTitle}>Historial</div>
        <nav className={styles.history} aria-label="Conversaciones">
          {chats.map((chat) => (
            <button key={chat.id} className={`${styles.chatItem} ${chat.id === chatId ? styles.chatActive : ""}`} onClick={() => cargarChat(chat.id)}>
              <span><strong>{chat.titulo || "Nueva conversación"}</strong><small>{fechaCorta(chat.ultima_interaccion || chat.fecha)}</small></span>
              <Trash2 size={15} onClick={(e) => eliminarChat(chat.id, e)} />
            </button>
          ))}
        </nav>
        <div className={styles.privacy}><Check size={15} /> Tus conversaciones están vinculadas a tu sesión.</div>
      </aside>

      <section className={styles.chatPanel}>
        <header className={styles.header}>
          <button className={styles.mobileMenu} onClick={() => setSidebar(true)} aria-label="Abrir historial"><Menu /></button>
          <div className={styles.assistant}><span className={styles.avatar}><Image src="/icons/cara_bymax.png" alt="Bymax" width={42} height={42} /></span><div><strong>Bymax</strong><small><i /> Disponible ahora</small></div></div>
          <div className={styles.headerActions}>
            <span className={styles.language}><Languages size={17} /> Idioma automático</span>
            <button className={vozActiva ? styles.activeAction : ""} onClick={() => { window.speechSynthesis?.cancel(); setVozActiva((v) => !v); }} title="Leer respuestas en voz alta">{vozActiva ? <Volume2 /> : <VolumeX />}</button>
          </div>
        </header>

        <div className={styles.messages} aria-live="polite">
          {cargando ? <div className={styles.loading}><span /><span /><span /></div> : mensajes.map((item) => (
            <div className={`${styles.messageRow} ${item.remitente === "usuario" ? styles.userRow : ""}`} key={item.id}>
              {item.remitente === "bot" && <span className={styles.miniAvatar}><Bot size={18} /></span>}
              <article className={`${styles.bubble} ${item.remitente === "usuario" ? styles.userBubble : styles.botBubble} ${item.error ? styles.errorBubble : ""}`}>
                <span className={styles.sender}>{item.remitente === "usuario" ? "Tú" : "Bymax"}</span>
                <ContenidoMensaje mensaje={item} />
                <time>{fechaCorta(item.fecha)}</time>
              </article>
            </div>
          ))}
          {enviando && <div className={styles.messageRow}><span className={styles.miniAvatar}><Bot size={18} /></span><div className={`${styles.bubble} ${styles.botBubble} ${styles.typing}`}><span /><span /><span /><em>Bymax está escribiendo…</em></div></div>}
          <div ref={finalRef} />
        </div>

        <footer className={styles.composerArea}>
          {error && <div className={styles.errorBanner}>{error}<button onClick={() => setError("")}><X size={16} /></button></div>}
          {ultimaPregunta && !enviando && <div className={styles.quickReplies}><button onClick={() => enviarTexto("Sí, confirmo")}>Sí, confirmar</button><button onClick={() => enviarTexto("No, cancelar")}>No, cancelar</button></div>}
          {imagen && <div className={styles.preview}><Image src={imagen.preview} alt="Vista previa" width={74} height={56} unoptimized /><span>{imagen.file.name}<small>Imagen médica · {(imagen.file.size / 1024 / 1024).toFixed(1)} MB</small></span><button onClick={() => setImagen(null)}><X size={18} /></button></div>}
          {escuchando && <div className={styles.listening}><span /> Escuchando… Di “Bymax” seguido de tu consulta.</div>}
          <div className={styles.composer}>
            <button onClick={() => fileRef.current?.click()} title="Adjuntar imagen médica"><ImagePlus /></button>
            <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionarImagen} />
            <textarea ref={inputRef} value={mensaje} rows={1} placeholder="Escribe o di ‘Bymax’ para comenzar…" onChange={(e) => setMensaje(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }} />
            <button className={escuchando ? styles.micActive : ""} onClick={alternarMicrofono} title="Comando por voz">{escuchando ? <MicOff /> : <Mic />}</button>
            <button className={styles.send} disabled={enviando || (!mensaje.trim() && !imagen)} onClick={() => enviarTexto()} title="Enviar"><Send /></button>
          </div>
          <p className={styles.disclaimer}>Bymax ofrece orientación general y no reemplaza la valoración de un profesional de la salud.</p>
        </footer>
      </section>
    </main>
  );
}
