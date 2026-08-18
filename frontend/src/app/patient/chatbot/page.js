"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, CalendarDays, Check, ImagePlus, Languages,
  Menu, Mic, MicOff, Play, Plus, Send, SlidersHorizontal, Stethoscope,
  Trash2, Volume2, VolumeX, X,
} from "lucide-react";
import { bymaxService } from "@/app/services/bymaxServices";
import styles from "./ChatBot.module.css";

const SALUDO = "Hola Soy Bymax Tu Asistente Personal. ¿En qué puedo ayudarte el dia de hoy?";
const CONFIG_VOZ_INICIAL = {
  voiceURI: "",
  rate: 0.96,
  pitch: 1.02,
  volume: 1,
};

function puntuacionVozNatural(voz) {
  const nombre = `${voz.name} ${voz.lang}`.toLowerCase();
  let puntos = 0;
  if (nombre.includes("es-co")) puntos += 60;
  else if (nombre.includes("es-")) puntos += 35;
  if (/natural|neural|online/.test(nombre)) puntos += 50;
  if (/google|microsoft/.test(nombre)) puntos += 25;
  if (/salome|dalia|elvira|sabina|helena|paulina/.test(nombre)) puntos += 15;
  if (!voz.localService) puntos += 10;
  return puntos;
}

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
  const [escuchaPermanente, setEscuchaPermanente] = useState(false);
  const [modoConversacion, setModoConversacion] = useState(false);
  const [vozActiva, setVozActiva] = useState(false);
  const [panelVoz, setPanelVoz] = useState(false);
  const [voces, setVoces] = useState([]);
  const [configVoz, setConfigVoz] = useState(CONFIG_VOZ_INICIAL);
  const [configVozCargada, setConfigVozCargada] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [error, setError] = useState("");
  const finalRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);
  const escuchaPersistenteRef = useRef(false);
  const reconocimientoActivoRef = useRef(false);
  const modoConversacionRef = useRef(false);
  const hablandoRef = useRef(false);
  const procesandoVozRef = useRef(false);
  const enviarTextoRef = useRef(null);
  const reinicioVozRef = useRef(null);
  const temporizadorConversacionRef = useRef(null);

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

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;

    try {
      const guardada = JSON.parse(
        localStorage.getItem("bymax_configuracion_voz") || "null"
      );
      if (guardada) {
        setConfigVoz((actual) => ({ ...actual, ...guardada }));
      }
    } catch {
      localStorage.removeItem("bymax_configuracion_voz");
    }
    setConfigVozCargada(true);

    const cargarVoces = () => {
      const disponibles = window.speechSynthesis.getVoices();
      setVoces(
        [...disponibles].sort(
          (a, b) => puntuacionVozNatural(b) - puntuacionVozNatural(a)
        )
      );
    };

    cargarVoces();
    window.speechSynthesis.addEventListener("voiceschanged", cargarVoces);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", cargarVoces);
    };
  }, []);

  useEffect(() => {
    if (!configVozCargada) return;
    localStorage.setItem(
      "bymax_configuracion_voz",
      JSON.stringify(configVoz)
    );
  }, [configVoz, configVozCargada]);

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
    let cancelado = false;
    (async () => {
      try {
        const lista = await bymaxService.listarChats();
        if (cancelado) return;
        setChats(lista);
        if (lista.length) await cargarChat(lista[0].id);
        else await nuevoChat();
      } catch (e) {
        if (!cancelado) { setError(e.message); setCargando(false); }
      }
    })();
    return () => { cancelado = true; };
  }, [cargarChat, nuevoChat]);

  const reanudarEscucha = useCallback(() => {
    if (
      !escuchaPersistenteRef.current ||
      hablandoRef.current ||
      procesandoVozRef.current
    ) return;
    window.clearTimeout(reinicioVozRef.current);
    reinicioVozRef.current = window.setTimeout(() => {
      if (reconocimientoActivoRef.current) return;
      try {
        recognitionRef.current?.start();
      } catch (errorVoz) {
        if (errorVoz?.name !== "InvalidStateError") {
          console.error("No fue posible reanudar la escucha:", errorVoz);
        }
      }
    }, 350);
  }, []);

  const hablar = useCallback((texto, forzar = false) => {
    if ((!vozActiva && !forzar) || !window.speechSynthesis || !texto) {
      reanudarEscucha();
      return;
    }

    window.speechSynthesis.cancel();
    hablandoRef.current = true;

    try {
      recognitionRef.current?.stop();
    } catch {}

    const voz = new SpeechSynthesisUtterance(texto);
    const seleccionada = configVoz.voiceURI
      ? voces.find((item) => item.voiceURI === configVoz.voiceURI)
      : voces[0];
    if (seleccionada) voz.voice = seleccionada;
    voz.lang = seleccionada?.lang || "es-CO";
    voz.rate = Number(configVoz.rate);
    voz.pitch = Number(configVoz.pitch);
    voz.volume = Number(configVoz.volume);
    voz.onend = () => {
      hablandoRef.current = false;
      reanudarEscucha();
    };
    voz.onerror = () => {
      hablandoRef.current = false;
      reanudarEscucha();
    };
    window.speechSynthesis.speak(voz);
  }, [configVoz, reanudarEscucha, voces, vozActiva]);

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
      hablar(
        bot.texto,
        escuchaPersistenteRef.current || modoConversacionRef.current
      );
      setChats((prev) => prev.map((chat) => chat.id === chatId ? { ...chat, ultima_interaccion: new Date().toISOString() } : chat));
    } catch (e) {
      setMensajes((prev) => [...prev, normalizarMensaje({ remitente: "bot", texto: e.message, error: true })]);
    } finally {
      setEnviando(false);
      procesandoVozRef.current = false;
      if (!hablandoRef.current) reanudarEscucha();
      inputRef.current?.focus();
    }
  }, [chatId, enviando, hablar, imagen, mensaje, reanudarEscucha]);

  useEffect(() => {
    enviarTextoRef.current = enviarTexto;
  }, [enviarTexto]);

  const renovarTiempoConversacion = useCallback(() => {
    window.clearTimeout(temporizadorConversacionRef.current);
    temporizadorConversacionRef.current = window.setTimeout(() => {
      modoConversacionRef.current = false;
      setModoConversacion(false);
      setMensaje("");
    }, 45000);
  }, []);

  const obtenerReconocimiento = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Tu navegador no admite reconocimiento de voz. Usa Chrome o Edge actualizado."
      );
      return null;
    }

    if (recognitionRef.current) return recognitionRef.current;

    const recognition = new SpeechRecognition();
    // SpeechRecognition solo admite un idioma por sesión. Español de Colombia
    // es el valor más fiable para el público principal de DocSmart.
    recognition.lang = "es-CO";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      reconocimientoActivoRef.current = true;
      setEscuchando(true);
      setError("");
    };
    recognition.onend = () => {
      reconocimientoActivoRef.current = false;
      setEscuchando(false);
      if (escuchaPersistenteRef.current && !hablandoRef.current) {
        reanudarEscucha();
      }
    };
    recognition.onerror = (evento) => {
      reconocimientoActivoRef.current = false;
      setEscuchando(false);
      if (["not-allowed", "service-not-allowed"].includes(evento.error)) {
        escuchaPersistenteRef.current = false;
        setEscuchaPermanente(false);
        modoConversacionRef.current = false;
        setModoConversacion(false);
        localStorage.removeItem("bymax_escucha_activa");
        setError(
          "Debes permitir el acceso al micrófono para activar a Bymax por voz."
        );
      } else if (evento.error === "audio-capture") {
        setError(
          "No se encontró un micrófono disponible. Revisa que no esté siendo usado por otra aplicación."
        );
      } else if (!["no-speech", "aborted"].includes(evento.error)) {
        setError(`No fue posible escuchar tu voz (${evento.error}).`);
      }
    };
    recognition.onresult = (event) => {
      for (
        let indice = event.resultIndex;
        indice < event.results.length;
        indice += 1
      ) {
        const resultado = event.results[indice];
        const alternativas = Array.from(resultado).map((item) =>
          item.transcript.trim()
        );
        const patronActivacion =
          /\b(bymax|by max|bai max|baymax|bei max|vaimax)\b/i;
        // Chrome puede reconocer "Bymax" correctamente en una alternativa
        // distinta de la primera. Priorizamos la que contenga la activación.
        const transcripcion =
          alternativas.find((texto) => patronActivacion.test(texto)) ||
          alternativas[0] ||
          "";

        if (!resultado.isFinal) {
          if (modoConversacionRef.current) setMensaje(transcripcion);
          continue;
        }

        const fraseFin =
          /\b(ad[ií]os bymax|termina(r)? conversaci[oó]n|deja de escuchar|hasta luego bymax)\b/i;

        if (modoConversacionRef.current && fraseFin.test(transcripcion)) {
          modoConversacionRef.current = false;
          setModoConversacion(false);
          setMensaje("");
          window.clearTimeout(temporizadorConversacionRef.current);
          hablar(
            "Entendido. Volveré a esperar hasta que digas Bymax.",
            true
          );
          continue;
        }

        const coincidencia = transcripcion.match(patronActivacion);

        if (!modoConversacionRef.current && !coincidencia) continue;

        let comando = transcripcion;

        if (coincidencia) {
          comando = transcripcion
            .slice((coincidencia.index || 0) + coincidencia[0].length)
            .replace(/^[,.:;\s]+/, "")
            .trim();

          modoConversacionRef.current = true;
          setModoConversacion(true);
        }

        renovarTiempoConversacion();
        setMensaje(comando);

        if (!comando) {
          hablar("Te escucho.", true);
          continue;
        }

        try {
          recognition.stop();
        } catch {}

        procesandoVozRef.current = true;
        enviarTextoRef.current?.(comando);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [hablar, reanudarEscucha, renovarTiempoConversacion]);

  const alternarMicrofono = async () => {
    if (escuchaPersistenteRef.current) {
      escuchaPersistenteRef.current = false;
      setEscuchaPermanente(false);
      modoConversacionRef.current = false;
      setModoConversacion(false);
      setEscuchando(false);
      reconocimientoActivoRef.current = false;
      setMensaje("");
      window.clearTimeout(reinicioVozRef.current);
      window.clearTimeout(temporizadorConversacionRef.current);
      window.speechSynthesis?.cancel();
      localStorage.removeItem("bymax_escucha_activa");

      try {
        recognitionRef.current?.abort();
      } catch {}
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite acceder al micrófono.");
      return;
    }

    // La petición debe ocurrir dentro del clic del usuario. Esto evita que
    // Chrome bloquee silenciosamente el reconocimiento al entrar a la ruta.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setError(
        "No pude acceder al micrófono. Permítelo desde el candado de la barra de direcciones y vuelve a intentarlo."
      );
      return;
    }

    const recognition = obtenerReconocimiento();
    if (!recognition) return;

    escuchaPersistenteRef.current = true;
    setEscuchaPermanente(true);
    setVozActiva(true);
    setError("");
    localStorage.setItem("bymax_escucha_activa", "true");

    try {
      if (!reconocimientoActivoRef.current) recognition.start();
    } catch (errorVoz) {
      if (errorVoz?.name !== "InvalidStateError") {
        setError("No fue posible activar el micrófono.");
      }
    }
  };

  useEffect(() => {
    if (localStorage.getItem("bymax_escucha_activa") !== "true") return;

    const recognition = obtenerReconocimiento();
    if (!recognition) return;

    escuchaPersistenteRef.current = true;
    setEscuchaPermanente(true);
    setVozActiva(true);

    // El navegador puede exigir un nuevo clic después de navegar o recargar.
    // Conservamos la preferencia, pero solo marcamos escucha al recibir onstart.
    try {
      if (!reconocimientoActivoRef.current) recognition.start();
    } catch {
      setEscuchaPermanente(false);
      escuchaPersistenteRef.current = false;
    }
  }, [obtenerReconocimiento]);

  useEffect(() => {
    return () => {
      escuchaPersistenteRef.current = false;
      reconocimientoActivoRef.current = false;
      window.clearTimeout(reinicioVozRef.current);
      window.clearTimeout(temporizadorConversacionRef.current);
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current?.abort();
      } catch {}
    };
  }, []);

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
  const vozSeleccionada = configVoz.voiceURI
    ? voces.find((item) => item.voiceURI === configVoz.voiceURI)
    : voces[0];

  const actualizarVoz = (campo, valor) => {
    setConfigVoz((actual) => ({ ...actual, [campo]: valor }));
  };

  const restaurarVoz = () => {
    window.speechSynthesis?.cancel();
    setConfigVoz(CONFIG_VOZ_INICIAL);
  };

  return (
    <main className={styles.shell}>
      {panelVoz && (
        <div className={styles.voiceOverlay} role="presentation" onMouseDown={() => setPanelVoz(false)}>
          <section className={styles.voicePanel} role="dialog" aria-modal="true" aria-labelledby="titulo-configuracion-voz" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.voicePanelHeader}>
              <div>
                <span className={styles.voiceIdentity}><Bot size={18} /> Identidad de Bymax</span>
                <h2 id="titulo-configuracion-voz">Configuración de voz</h2>
                <p>Elige cómo quieres escuchar al asistente.</p>
              </div>
              <button onClick={() => setPanelVoz(false)} aria-label="Cerrar configuración"><X /></button>
            </div>

            <div className={styles.voiceProfile}>
              <span className={styles.voiceProfileAvatar}><Volume2 /></span>
              <div><strong>Bymax Natural</strong><small>Voz cálida, clara y profesional</small></div>
              <span className={styles.voiceRecommended}>Recomendada</span>
            </div>

            <label className={styles.voiceField}>
              <span>Voz del asistente</span>
              <select value={configVoz.voiceURI} onChange={(event) => actualizarVoz("voiceURI", event.target.value)}>
                <option value="">Bymax Natural · selección automática</option>
                {voces.map((voz) => (
                  <option value={voz.voiceURI} key={voz.voiceURI}>
                    {voz.name} · {voz.lang}{voz.localService ? "" : " · en línea"}
                  </option>
                ))}
              </select>
              <small>Actual: {vozSeleccionada ? `${vozSeleccionada.name} (${vozSeleccionada.lang})` : "voz predeterminada del sistema"}</small>
            </label>

            <label className={styles.voiceRange}>
              <span><strong>Velocidad</strong><output>{Number(configVoz.rate).toFixed(2)}×</output></span>
              <input type="range" min="0.75" max="1.25" step="0.01" value={configVoz.rate} onChange={(event) => actualizarVoz("rate", event.target.value)} />
              <small><i>Lenta</i><i>Natural</i><i>Rápida</i></small>
            </label>

            <label className={styles.voiceRange}>
              <span><strong>Tono</strong><output>{Number(configVoz.pitch).toFixed(2)}</output></span>
              <input type="range" min="0.75" max="1.3" step="0.01" value={configVoz.pitch} onChange={(event) => actualizarVoz("pitch", event.target.value)} />
              <small><i>Grave</i><i>Equilibrado</i><i>Agudo</i></small>
            </label>

            <label className={styles.voiceRange}>
              <span><strong>Volumen</strong><output>{Math.round(Number(configVoz.volume) * 100)}%</output></span>
              <input type="range" min="0.2" max="1" step="0.05" value={configVoz.volume} onChange={(event) => actualizarVoz("volume", event.target.value)} />
            </label>

            <div className={styles.voiceActions}>
              <button className={styles.voiceReset} onClick={restaurarVoz}>Restaurar</button>
              <button className={styles.voiceTest} onClick={() => hablar("Hola, soy Bymax. Estoy aquí para acompañarte y ayudarte con tu salud.", true)}><Play size={17} /> Probar voz</button>
            </div>
            <p className={styles.voiceNote}>Las voces disponibles dependen de Chrome, Edge y de las voces instaladas en tu dispositivo.</p>
          </section>
        </div>
      )}
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
          <div className={styles.assistant}><span className={styles.avatar}><Image src="/icons/cara_bymax.png" alt="Bymax" width={42} height={42} /></span><div><strong>Bymax</strong><small><i /> {modoConversacion ? "Conversación por voz" : escuchaPermanente ? "Esperando «Bymax»" : "Disponible ahora"}</small></div></div>
          <div className={styles.headerActions}>
            <span className={styles.language}><Languages size={17} /> Idioma automático</span>
            <button onClick={() => setPanelVoz(true)} title="Configurar voz de Bymax"><SlidersHorizontal /></button>
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
          {escuchaPermanente && <div className={styles.listening}><span /> {modoConversacion ? "Conversación activa: habla con naturalidad. Di «terminar conversación» para salir." : escuchando ? "Escucha activa: di «Bymax» para comenzar." : "Bymax está respondiendo y volverá a escuchar enseguida."}</div>}
          <div className={styles.composer}>
            <button onClick={() => fileRef.current?.click()} title="Adjuntar imagen médica"><ImagePlus /></button>
            <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={seleccionarImagen} />
            <textarea ref={inputRef} value={mensaje} rows={1} placeholder="Escribe o di ‘Bymax’ para comenzar…" onChange={(e) => setMensaje(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }} />
            <button className={escuchaPermanente ? styles.micActive : ""} onClick={alternarMicrofono} title={escuchaPermanente ? "Desactivar escucha permanente" : "Activar escucha permanente"}>{escuchaPermanente ? <MicOff /> : <Mic />}</button>
            <button className={styles.send} disabled={enviando || (!mensaje.trim() && !imagen)} onClick={() => enviarTexto()} title="Enviar"><Send /></button>
          </div>
          <p className={styles.disclaimer}>Bymax ofrece orientación general y no reemplaza la valoración de un profesional de la salud.</p>
        </footer>
      </section>
    </main>
  );
}
