"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, CalendarDays, Check, ImagePlus, Languages,
  Menu, Mic, MicOff, Minus, Play, Plus, Send, SlidersHorizontal, Stethoscope,
  Trash2, Volume2, VolumeX, X,
} from "lucide-react";
import { bymaxService } from "@/app/services/bymaxServices";
import useDraggableAssistant from "../hooks/useDraggableAssistant";
import styles from "./BymaxAssistant.module.css";

const SALUDO = "Hola mi nombre es Bymax y soy tu asistente virtual. ¿En qué puedo ayudarte el dia de hoy?";
const CONFIG_VOZ_INICIAL = {
  motor: "neural",
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

export default function BymaxAssistant() {
  const [ventanaAbierta, setVentanaAbierta] = useState(false);
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
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const solicitudVozRef = useRef(0);
  const socketRef = useRef(null);
  const mensajeStreamingRef = useRef(null);
  const bufferVozRef = useRef("");
  const colaVozRef = useRef([]);
  const reproduciendoColaRef = useRef(false);
  const streamFinalizadoRef = useRef(false);
  const configVozRef = useRef(CONFIG_VOZ_INICIAL);
  const vozActivaRef = useRef(false);
  const finalizarTurnoStreamRef = useRef(null);
  const procesarColaVozRef = useRef(null);
  // Se decide una sola vez por respuesta para impedir que se mezclen voces.
  // Valores: pendiente | neural | local.
  const motorTurnoRef = useRef("pendiente");
  const abrirVentana = useCallback(() => {
    setVentanaAbierta(true);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, []);
  const { positionStyle, dragHandlers } = useDraggableAssistant(abrirVentana);

  useEffect(() => {
    window.addEventListener("bymax:open", abrirVentana);
    return () => window.removeEventListener("bymax:open", abrirVentana);
  }, [abrirVentana]);

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, enviando]);

  useEffect(() => {
    configVozRef.current = configVoz;
    vozActivaRef.current = vozActiva;
  }, [configVoz, vozActiva]);

  useEffect(() => {
    if (!window.speechSynthesis) return undefined;

    try {
      const guardada = JSON.parse(
        localStorage.getItem("bymax_configuracion_voz") || "null"
      );
      if (guardada) {
        setConfigVoz((actual) => ({
          ...actual,
          ...guardada,
          motor: guardada.motor || "neural",
        }));
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
    ) {
      return;
    }

    window.clearTimeout(reinicioVozRef.current);

    reinicioVozRef.current = window.setTimeout(() => {
      if (
        !escuchaPersistenteRef.current ||
        reconocimientoActivoRef.current ||
        hablandoRef.current ||
        procesandoVozRef.current
      ) {
        return;
      }

      try {
        recognitionRef.current?.start();
      } catch (errorVoz) {
        if (errorVoz?.name !== "InvalidStateError") {
          console.error(
            "No fue posible reanudar la escucha:",
            errorVoz,
          );
        }
      }
    }, 500);
  }, []);

  const finalizarTurnoStream = useCallback(() => {
    if (
      !streamFinalizadoRef.current ||
      reproduciendoColaRef.current ||
      colaVozRef.current.length
    ) return;

    hablandoRef.current = false;
    procesandoVozRef.current = false;
    setEnviando(false);
    mensajeStreamingRef.current = null;
    inputRef.current?.focus();
    reanudarEscucha();
  }, [reanudarEscucha]);

  useEffect(() => {
    finalizarTurnoStreamRef.current = finalizarTurnoStream;
  }, [finalizarTurnoStream]);

  const reproducirTextoLocal = useCallback((texto) => new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    const config = configVozRef.current;
    const utterance = new SpeechSynthesisUtterance(texto);
    const seleccionada = config.voiceURI
      ? voces.find((item) => item.voiceURI === config.voiceURI)
      : voces[0];
    if (seleccionada) utterance.voice = seleccionada;
    utterance.lang = seleccionada?.lang || "es-CO";
    utterance.rate = Number(config.rate);
    utterance.pitch = Number(config.pitch);
    utterance.volume = Number(config.volume);
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  }), [voces]);

  const procesarColaVoz = useCallback(async () => {
    if (reproduciendoColaRef.current) return;
    const item = colaVozRef.current.shift();
    if (!item) {
      finalizarTurnoStreamRef.current?.();
      return;
    }

    reproduciendoColaRef.current = true;
    hablandoRef.current = true;

    try {
      const config = configVozRef.current;
      const debeUsarNeural =
        config.motor === "neural" && motorTurnoRef.current !== "local";

      if (debeUsarNeural) {
        let blob;

        try {
          const resultadoAudio = item.audioPromise
            ? await item.audioPromise
            : await bymaxService
              .generarVoz(item.texto, Number(config.rate))
              .then((audio) => ({ blob: audio }))
              .catch((error) => ({ error }));

          if (resultadoAudio.error) throw resultadoAudio.error;
          blob = resultadoAudio.blob;
          motorTurnoRef.current = "neural";

          // Mientras esta frase se reproduce, ElevenLabs prepara las que ya
          // están en cola. Así no esperamos otra petición HTTP entre frases.
          colaVozRef.current.slice(0, 2).forEach((pendiente) => {
            if (pendiente.audioPromise) return;
            pendiente.audioPromise = bymaxService
              .generarVoz(pendiente.texto, Number(config.rate))
              .then((audio) => ({ blob: audio }))
              .catch((error) => ({ error }));
          });
        } catch (errorVoz) {
          // Solo se permite elegir la voz local antes de haber reproducido la
          // primera frase neuronal. Si ElevenLabs ya fue elegido, jamás se
          // intercala una voz distinta dentro de la misma respuesta.
          if (motorTurnoRef.current === "pendiente") {
            motorTurnoRef.current = "local";
            console.warn(
              "ElevenLabs no está disponible; todo el turno usará voz local:",
              errorVoz,
            );
            await reproducirTextoLocal(item.texto);
            return;
          }

          console.error(
            "ElevenLabs falló durante un turno neuronal; no se mezclará la voz local:",
            errorVoz,
          );
          return;
        }

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.volume = Number(configVozRef.current.volume);
        await new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = reject;
          audio.play().catch(reject);
        });
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        audioRef.current = null;
      } else {
        motorTurnoRef.current = "local";
        await reproducirTextoLocal(item.texto);
      }
    } catch (errorVoz) {
      console.error("No fue posible reproducir la frase de Bymax:", errorVoz);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
      audioRef.current = null;
      // No hacemos fallback aquí: si ya comenzó ElevenLabs, usar la voz local
      // produciría exactamente la mezcla de voces que queremos evitar.
    } finally {
      reproduciendoColaRef.current = false;
      procesarColaVozRef.current?.();
    }
  }, [reproducirTextoLocal]);

  useEffect(() => {
    procesarColaVozRef.current = procesarColaVoz;
  }, [procesarColaVoz]);

  const encolarFrase = useCallback((texto) => {
    const frase = String(texto || "").trim();
    if (
      !frase ||
      (!vozActivaRef.current &&
        !escuchaPersistenteRef.current &&
        !modoConversacionRef.current)
    ) return;

    const config = configVozRef.current;
    const debePrecargar =
      config.motor === "neural" &&
      motorTurnoRef.current === "neural" &&
      colaVozRef.current.filter((item) => item.audioPromise).length < 2;

    const audioPromise = debePrecargar
      ? bymaxService
        .generarVoz(frase, Number(config.rate))
        .then((audio) => ({ blob: audio }))
        .catch((error) => ({ error }))
      : null;

    colaVozRef.current.push({ texto: frase, audioPromise });
    procesarColaVozRef.current?.();
  }, []);

  const extraerFrases = useCallback((forzar = false) => {
    let buffer = bufferVozRef.current;
    let coincidencia;
    const patron = /^([\s\S]*?[.!?…](?:\s+|$))/;

    while ((coincidencia = buffer.match(patron))) {
      encolarFrase(coincidencia[1]);
      buffer = buffer.slice(coincidencia[1].length);
    }

    if (forzar && buffer.trim()) {
      encolarFrase(buffer);
      buffer = "";
    }
    bufferVozRef.current = buffer;
  }, [encolarFrase]);

  useEffect(() => {
    if (!chatId) return undefined;

    const socket = bymaxService.crearSocket(chatId);
    socketRef.current = socket;

    socket.onmessage = (evento) => {
      const data = JSON.parse(evento.data);

      if (data.tipo === "texto") {
        const fragmento = String(data.contenido || "");
        setMensajes((prev) => prev.map((item) =>
          item.id === mensajeStreamingRef.current
            ? { ...item, texto: item.texto + fragmento }
            : item
        ));
        bufferVozRef.current += fragmento;
        extraerFrases(false);
      } else if (data.tipo === "fin") {
        setMensajes((prev) => prev.map((item) =>
          item.id === mensajeStreamingRef.current
            ? { ...item, resultado: data.resultado || item.resultado }
            : item
        ));
        streamFinalizadoRef.current = true;
        extraerFrases(true);
        setChats((prev) => prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, ultima_interaccion: new Date().toISOString() }
            : chat
        ));
        finalizarTurnoStreamRef.current?.();
      } else if (data.tipo === "error") {
        setMensajes((prev) => prev.map((item) =>
          item.id === mensajeStreamingRef.current
            ? { ...item, texto: data.mensaje, error: true }
            : item
        ));
        streamFinalizadoRef.current = true;
        bufferVozRef.current = "";
        finalizarTurnoStreamRef.current?.();
      }
    };

    socket.onerror = () => {
      setError("Se perdió la conexión en tiempo real con Bymax.");
    };

    socket.onclose = () => {
      if (mensajeStreamingRef.current && !streamFinalizadoRef.current) {
        setMensajes((prev) => prev.map((item) =>
          item.id === mensajeStreamingRef.current && !item.texto
            ? { ...item, texto: "La conexión con Bymax se cerró. Intenta nuevamente.", error: true }
            : item
        ));
        streamFinalizadoRef.current = true;
        finalizarTurnoStreamRef.current?.();
      }
    };

    return () => {
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [chatId, extraerFrases]);
  
  const finalizarVoz = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    audioRef.current = null;
    hablandoRef.current = false;
    reanudarEscucha();
  }, [reanudarEscucha]);

  const hablarConNavegador = useCallback((texto) => {
    if (!window.speechSynthesis) {
      finalizarVoz();
      return;
    }

    const voz = new SpeechSynthesisUtterance(texto);
    const seleccionada = configVoz.voiceURI
      ? voces.find((item) => item.voiceURI === configVoz.voiceURI)
      : voces[0];
    if (seleccionada) voz.voice = seleccionada;
    voz.lang = seleccionada?.lang || "es-CO";
    voz.rate = Number(configVoz.rate);
    voz.pitch = Number(configVoz.pitch);
    voz.volume = Number(configVoz.volume);
    voz.onend = finalizarVoz;
    voz.onerror = finalizarVoz;
    window.speechSynthesis.speak(voz);
  }, [configVoz, finalizarVoz, voces]);

  const hablar = useCallback(async (texto, forzar = false) => {
    if ((!vozActiva && !forzar) || !texto) {
      reanudarEscucha();
      return;
    }

    const solicitudActual = solicitudVozRef.current + 1;
    solicitudVozRef.current = solicitudActual;
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    hablandoRef.current = true;

    try {
      recognitionRef.current?.stop();
    } catch {}

    if (configVoz.motor !== "neural") {
      hablarConNavegador(texto);
      return;
    }

    try {
      const blob = await bymaxService.generarVoz(texto, Number(configVoz.rate));
      if (solicitudActual !== solicitudVozRef.current) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioUrlRef.current = url;
      audioRef.current = audio;
      audio.volume = Number(configVoz.volume);
      audio.onended = finalizarVoz;
      audio.onerror = () => {
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
        audioRef.current = null;
        hablandoRef.current = true;
        hablarConNavegador(texto);
      };
      await audio.play();
    } catch (errorVoz) {
      if (solicitudActual !== solicitudVozRef.current) return;
      console.warn("Se utilizará la voz local de respaldo:", errorVoz);
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioRef.current = null;
      audioUrlRef.current = null;
      hablarConNavegador(texto);
    }
  }, [configVoz, finalizarVoz, hablarConNavegador, reanudarEscucha, vozActiva]);

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
    procesandoVozRef.current = true;
    setError("");

    const socket = socketRef.current;
    if (!archivo && socket?.readyState === WebSocket.OPEN) {
      // Detener cualquier locución anterior antes de seleccionar el motor del
      // nuevo turno. Así una voz local previa no se superpone con ElevenLabs.
      window.speechSynthesis?.cancel();
      solicitudVozRef.current += 1;
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioRef.current = null;
      audioUrlRef.current = null;

      const botTemporal = normalizarMensaje({ remitente: "bot", texto: "" });
      mensajeStreamingRef.current = botTemporal.id;
      bufferVozRef.current = "";
      colaVozRef.current = [];
      motorTurnoRef.current =
        configVozRef.current.motor === "neural" ? "pendiente" : "local";
      streamFinalizadoRef.current = false;
      setMensajes((prev) => [...prev, botTemporal]);
      try { recognitionRef.current?.stop(); } catch {}
      socket.send(JSON.stringify({ tipo: "mensaje", mensaje: temporal.texto }));
      return;
    }

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
    // El modo conversación ya no caduca por tiempo. Después de pronunciar
    // "Bymax" una vez permanece activo mientras el micrófono general siga
    // habilitado. Solo una orden explícita o el botón pueden apagarlo.
    window.clearTimeout(temporizadorConversacionRef.current);
    temporizadorConversacionRef.current = null;

    if (escuchaPersistenteRef.current) {
      modoConversacionRef.current = true;
      setModoConversacion(true);
    }
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
          abrirVentana();
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
  }, [abrirVentana, hablar, reanudarEscucha, renovarTiempoConversacion]);

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
      solicitudVozRef.current += 1;
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioRef.current = null;
      audioUrlRef.current = null;
      colaVozRef.current = [];
      bufferVozRef.current = "";
      reproduciendoColaRef.current = false;
      hablandoRef.current = false;
      procesandoVozRef.current = false;
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
      solicitudVozRef.current += 1;
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioRef.current = null;
      audioUrlRef.current = null;
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

  const ultimoMensaje = mensajes.at(-1);
  const requiereConfirmacion = Boolean(
    ultimoMensaje?.remitente === "bot" &&
    (ultimoMensaje?.resultado?.requires_confirmation ||
      ultimoMensaje?.resultado?.data?.requires_confirmation)
  );
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

  const alternarLectura = () => {
    solicitudVozRef.current += 1;
    window.speechSynthesis?.cancel();
    if (audioRef.current) audioRef.current.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioRef.current = null;
    audioUrlRef.current = null;
    hablandoRef.current = false;
    setVozActiva((actual) => !actual);
    reanudarEscucha();
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.launcher} ${escuchando ? styles.launcherListening : ""}`}
        style={positionStyle}
        aria-label={ventanaAbierta ? "Bymax está abierto. Arrastra para mover" : "Abrir Bymax. Arrastra para mover"}
        title="Bymax · Arrastra para mover o pulsa para abrir"
        {...dragHandlers}
      >
        <span className={styles.launcherGlow} />
        <span className={styles.launcherOrb}>
          <Image src="/icons/asistente_bymax.png" alt="" width={72} height={72} priority />
        </span>
        <span className={styles.launcherStatus} />
        <span className={styles.launcherLabel}>{escuchando ? "Escuchando" : "Bymax"}</span>
      </button>

      {ventanaAbierta && <main className={styles.shell} role="dialog" aria-label="Chat con Bymax">
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
              <select
                value={configVoz.motor === "neural" ? "__neural__" : configVoz.voiceURI}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__neural__") {
                    setConfigVoz((actual) => ({ ...actual, motor: "neural" }));
                  } else {
                    setConfigVoz((actual) => ({ ...actual, motor: "browser", voiceURI: value }));
                  }
                }}
              >
                <option value="__neural__">Bymax Neural · ElevenLabs</option>
                <option value="">Voz natural automática del dispositivo</option>
                {voces.map((voz) => (
                  <option value={voz.voiceURI} key={voz.voiceURI}>
                    {voz.name} · {voz.lang}{voz.localService ? "" : " · en línea"}
                  </option>
                ))}
              </select>
              <small>Actual: {configVoz.motor === "neural" ? "identidad neuronal de Bymax" : vozSeleccionada ? `${vozSeleccionada.name} (${vozSeleccionada.lang})` : "voz predeterminada del sistema"}</small>
            </label>

            <label className={styles.voiceRange}>
              <span><strong>Velocidad</strong><output>{Number(configVoz.rate).toFixed(2)}×</output></span>
              <input type="range" min="0.75" max="1.2" step="0.01" value={configVoz.rate} onChange={(event) => actualizarVoz("rate", event.target.value)} />
              <small><i>Lenta</i><i>Natural</i><i>Rápida</i></small>
            </label>

            <label className={styles.voiceRange}>
              <span><strong>Tono</strong><output>{Number(configVoz.pitch).toFixed(2)}</output></span>
              <input type="range" min="0.75" max="1.3" step="0.01" value={configVoz.pitch} onChange={(event) => actualizarVoz("pitch", event.target.value)} />
              <small><i>Grave</i><i>Equilibrado</i><i>Agudo · respaldo local</i></small>
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
        <div className={styles.brand}><span className={styles.brandIcon}><Image src="/icons/asistente_bymax.png" alt="" width={30} height={30} /></span><div><strong>Bymax</strong><small>Asistente DocSmart</small></div></div>
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
          <div className={styles.assistant}><span className={styles.avatar}><Image src="/icons/asistente_bymax.png" alt="Bymax" width={42} height={42} /></span><div><strong>Bymax</strong><small><i /> {modoConversacion ? "Conversación por voz" : escuchaPermanente ? "Esperando «Bymax»" : "Disponible ahora"}</small></div></div>
          <div className={styles.headerActions}>
            <span className={styles.language}><Languages size={17} /> Idioma automático</span>
            <button onClick={() => setPanelVoz(true)} title="Configurar voz de Bymax"><SlidersHorizontal /></button>
            <button className={vozActiva ? styles.activeAction : ""} onClick={alternarLectura} title="Leer respuestas en voz alta">{vozActiva ? <Volume2 /> : <VolumeX />}</button>
            <button onClick={() => setVentanaAbierta(false)} title="Minimizar chat"><Minus /></button>
          </div>
        </header>

        <div className={styles.messages} aria-live="polite">
          {cargando ? <div className={styles.loading}><span /><span /><span /></div> : mensajes.map((item) => (
            <div className={`${styles.messageRow} ${item.remitente === "usuario" ? styles.userRow : ""}`} key={item.id}>
              {item.remitente === "bot" && <span className={styles.miniAvatar}><Image src="/icons/asistente_bymax.png" alt="" width={24} height={24} /></span>}
              <article className={`${styles.bubble} ${item.remitente === "usuario" ? styles.userBubble : styles.botBubble} ${item.error ? styles.errorBubble : ""}`}>
                <span className={styles.sender}>{item.remitente === "usuario" ? "Tú" : "Bymax"}</span>
                <ContenidoMensaje mensaje={item} />
                <time>{fechaCorta(item.fecha)}</time>
              </article>
            </div>
          ))}
          {enviando && <div className={styles.messageRow}><span className={styles.miniAvatar}><Image src="/icons/asistente_bymax.png" alt="" width={24} height={24} /></span><div className={`${styles.bubble} ${styles.botBubble} ${styles.typing}`}><span /><span /><span /><em>Bymax está escribiendo…</em></div></div>}
          <div ref={finalRef} />
        </div>

        <footer className={styles.composerArea}>
          {error && <div className={styles.errorBanner}>{error}<button onClick={() => setError("")}><X size={16} /></button></div>}
          {requiereConfirmacion && !enviando && <div className={styles.quickReplies}><button onClick={() => enviarTexto("Sí, confirmo")}>Sí, confirmar</button><button onClick={() => enviarTexto("No, cancelar")}>No, cancelar</button></div>}
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
      </main>}
    </>
  );
}
