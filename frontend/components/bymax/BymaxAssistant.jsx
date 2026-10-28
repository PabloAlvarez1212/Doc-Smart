"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { bymaxService } from "@/app/services/bymaxServices";
import useBymaxVoice from "../hooks/useBymaxVoice";
import useDraggableAssistant from "../hooks/useDraggableAssistant";
import useBymaxViewport from "./useBymaxViewport";
import BymaxLauncher from "./BymaxLauncher";
import BymaxChatWindow from "./BymaxChatWindow";
import BymaxDoctorContext from "./BymaxDoctorContext";
import useBymaxIdentity from "./useBymaxIdentity";
import { takeSpeechUnits, flushSpeechBuffer, SPEECH_MAX_WAIT_MS } from "./bymaxSpeechUnits.mjs";
import { matchesTurn, latencyTrace, recoverResponse, esAfirmacionDictada } from "./bymaxTurn.mjs";
import { assistantState } from "./bymaxPresentation.mjs";

const SALUDO = "Hola, soy Bymax, tu asistente virtual de DocSmart. ¿En qué puedo ayudarte el dia de hoy?";
function normalizarMensaje(item) {
  return {
    id: item.id || crypto.randomUUID(),
    remitente: item.es_bot ? "bot" : (item.remitente || "usuario"),
    texto: String(item.contenido ?? item.texto ?? ""),
    fecha: item.fecha || new Date().toISOString(),
    resultado: item.resultado || null, imagen: item.imagen || null, error: Boolean(item.error),
  };
}
export default function BymaxAssistant({ modo = "paciente", actorKey }) {
  const saludo = modo === "medico" ? "Hola, soy Bymax Médico, tu copiloto clínico y operativo. Selecciona un paciente para revisar tus registros, estudiar diferenciales o preparar borradores para tu valoración." : SALUDO;
  const [ventanaAbierta, setVentanaAbierta] = useState(false);
  const [copilotoAbierto, setCopilotoAbierto] = useState(false);
  const { identity } = useBymaxIdentity();
  const greetingRef = useRef(saludo);
  greetingRef.current = identity?.saludo || saludo;
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const playbackTraceRef = useRef(null);
  const [sidebar, setSidebar] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const launcherRef = useRef(null);
  const socketRef = useRef(null);
  const turnRef = useRef(null);
  const sendingRef = useRef(false);
  const sendRef = useRef(null);
  const epochRef = useRef(0);
  const imageUrls = useRef(new Set());
  const voiceRef = useRef(null);
  const confirmationRef = useRef(false);
  const abrirVentana = useCallback(() => { setVentanaAbierta(true); }, []);
  const voice = useBymaxVoice({
    actorKey,
    generateVoice: bymaxService.generarVoz,
    available: Boolean(chatId) && !cargando,
    onEnd: () => { setMensaje(""); setMensajes(previous => [...previous, normalizarMensaje({remitente:"bot", texto:"Conversación terminada. Di «Bymax» cuando quieras volver a conversar."})]); },
    onTranscript: text => {
      if (confirmationRef.current && esAfirmacionDictada(text)) {
        setMensaje(text);
        setError("Por seguridad no confirmo operaciones por voz. Revisa los datos y usa el botón «Sí, confirmar».");
        voiceRef.current?.completeTurn();
        return;
      }
      sendRef.current?.(text);
    },
    onPartial: text => setMensaje(text), onWake: abrirVentana,
    isBusy: () => sendingRef.current || cargando || !chatId,
  });
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  const viewportStyle = useBymaxViewport();
  const draggable = useDraggableAssistant(abrirVentana);
  useEffect(() => {
    window.addEventListener("bymax:open", abrirVentana);
    return () => window.removeEventListener("bymax:open", abrirVentana);
  }, [abrirVentana]);

  const cancelTurn = useCallback(() => {
    const turn = turnRef.current;
    if (turn) {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({tipo:"cancelar", request_id:turn.requestId}));
      }
      turn.controller?.abort();
      turn.mark?.("cancelled");
      setMensajes(previous => previous.map(item => item.id === turn.id
        ? {...item, texto:item.texto || "Respuesta interrumpida. Revisa el historial si había una operación en curso."} : item));
    }
    epochRef.current += 1;
    turnRef.current = null;
    playbackTraceRef.current = null;
    sendingRef.current = false;
    setEnviando(false); setGenerating(false); setStreamingId(null);
    voiceRef.current?.stopPlayback();
    voiceRef.current?.completeTurn();
  }, []);
  useEffect(() => {
    function timing(event) {
      const trace = playbackTraceRef.current;
      if (!trace || event.detail.response_id !== trace.id) return;
      if (event.detail.event === "playing") {
        trace.mark("first_audio");
        if (trace.audioEnd != null) window.dispatchEvent(new CustomEvent("bymax:latency", {detail:{response_id:trace.requestId,event:"audio_gap",elapsed_ms:Math.round((event.detail.at - trace.audioEnd) * 100) / 100}}));
        trace.audioEnd = null;
      } else if (event.detail.event === "ended") trace.audioEnd = event.detail.at;
    }
    window.addEventListener("bymax:audio-timing", timing);
    return () => window.removeEventListener("bymax:audio-timing", timing);
  }, []);
  const resetInteraction = useCallback(() => {
    cancelTurn();
    epochRef.current += 1;
    turnRef.current = null;
    sendingRef.current = false;
    setEnviando(false);
    setStreamingId(null);
    // Dictation of the previous conversation must not reach the next one.
    if (voiceRef.current?.discardDictation()) setMensaje("");
    voiceRef.current?.beginTurn();
  }, [cancelTurn]);
  const cargarChat = useCallback(async id => {
    resetInteraction();
    const epoch = epochRef.current;
    setCargando(true);
    setError("");
    try {
      const data = await bymaxService.obtenerMensajes(id);
      if (epoch !== epochRef.current) return;
      setChatId(id);
      setMensajes(data.length ? data.map(normalizarMensaje) : [normalizarMensaje({remitente:"bot", texto:greetingRef.current})]);
      setSidebar(false);
    } catch (e) { if (epoch === epochRef.current) setError(e.message); }
    finally { if (epoch === epochRef.current) { setCargando(false); voiceRef.current?.completeTurn(); } }
  }, [resetInteraction]);
  const nuevoChat = useCallback(async () => {
    resetInteraction();
    const epoch = epochRef.current;
    setCargando(true);
    setError("");
    try {
      const nuevo = await bymaxService.iniciarChat();
      if (epoch !== epochRef.current) return;
      setChats(previous => [nuevo, ...previous.filter(chat => chat.id !== nuevo.id)]);
      setChatId(nuevo.id);
      setMensajes([normalizarMensaje({remitente:"bot",texto:greetingRef.current})]);
      setSidebar(false);
    } catch (e) { if (epoch === epochRef.current) setError(e.message); }
    finally { if (epoch === epochRef.current) { setCargando(false); voiceRef.current?.completeTurn(); } }
  }, [resetInteraction]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lista = await bymaxService.listarChats();
        if (cancelled) return;
        setChats(lista);
        if (lista.length) await cargarChat(lista[0].id); else await nuevoChat();
      } catch (e) { if (!cancelled) { setError(e.message); setCargando(false); voiceRef.current?.completeTurn(); } }
    })();
    return () => {
      cancelled = true; epochRef.current += 1;
      turnRef.current?.controller?.abort();
      turnRef.current = null; playbackTraceRef.current = null;
    };
  }, [cargarChat, nuevoChat]);

  useEffect(() => {
    if (!chatId) return;
    const socket = bymaxService.crearSocket(chatId);
    socketRef.current = socket;
    setConnection("connecting");
    socket.onopen = () => setConnection("connected");
    function finish() {
      turnRef.current = null;
      sendingRef.current = false;
      setEnviando(false);
      setGenerating(false);
      setStreamingId(null);
      voiceRef.current?.completeTurn();
    }
    function speakFragments(turn, final = false) {
      clearTimeout(turn.flushTimer);
      const { units, remaining } = takeSpeechUnits(turn.buffer, final);
      for (const unit of units) voiceRef.current?.enqueue(unit, turn.id);
      turn.buffer = remaining;
      // Long stretches without punctuation are spoken after a bounded wait.
      if (!final && remaining.trim()) {
        turn.flushTimer = setTimeout(() => {
          if (turnRef.current !== turn) return;
          const flushed = flushSpeechBuffer(turn.buffer);
          for (const unit of flushed.units) voiceRef.current?.enqueue(unit, turn.id);
          turn.buffer = flushed.remaining;
        }, SPEECH_MAX_WAIT_MS);
      }
    }
    socket.onmessage = event => {
      const turn = turnRef.current;
      if (!turn || turn.chatId !== chatId) return;
      let data;
      try { data = JSON.parse(event.data); } catch { setError("Recibí una respuesta que no pude interpretar."); finish(); return; }
      if (!matchesTurn(turn, data)) return;
      if (data.tipo === "texto") {
        turn.mark("first_text");
        requestAnimationFrame(() => { if (playbackTraceRef.current === turn) turn.mark("first_text_frame"); });
        setGenerating(true);
        turn.received = true;
        const fragment = String(data.contenido || "");
        turn.buffer += fragment;
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:item.texto + fragment} : item));
        speakFragments(turn);
      } else if (data.tipo === "fin") {
        turn.mark("complete");
        if (!turn.received) turn.buffer = String(data.respuesta || "");
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:data.respuesta || item.texto,resultado:data.resultado || item.resultado} : item));
        speakFragments(turn, true);
        setChats(previous => previous.map(chat => chat.id === chatId ? {...chat,ultima_interaccion:new Date().toISOString()} : chat));
        finish();
      } else if (data.tipo === "cancelado") {
        cancelTurn();
      } else if (data.tipo === "error") {
        voiceRef.current?.stopPlayback();
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:data.mensaje || "No fue posible completar la respuesta.",error:true} : item));
        finish();
      }
    };
    socket.onerror = () => setConnection("disconnected");
    socket.onclose = async () => {
      setConnection("disconnected");
      const turn = turnRef.current;
      if (turn?.chatId !== chatId || !turn.websocket) return;
      voiceRef.current?.stopPlayback();
      setError("Se interrumpió la conexión. Recuperando el mismo mensaje…");
      // Same idempotency key: recovery can never repeat a confirmed appointment.
      try {
        const response = await recoverResponse({
          requestId:turn.requestId, signal:turn.controller.signal,
          send:(requestId, signal) => bymaxService.enviarMensaje(chatId, turn.text, null, requestId, signal),
        });
        if (turnRef.current !== turn) return;
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:response.respuesta,resultado:response.resultado} : item));
        turn.mark("complete");
        setError("");
        finish();
      } catch {
        if (turnRef.current !== turn) return;
        setError("No pude recuperar la respuesta. Consulta el historial antes de repetir una operación.");
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:item.texto || "La respuesta quedará disponible en el historial.",error:true} : item));
        finish();
      }
    };
    return () => {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [chatId, connectionAttempt, cancelTurn]);

  const enviarTexto = useCallback(async (forced, soloTexto = false) => {
    const text = String(forced ?? mensaje).trim();
    if ((!text && !imagen) || !chatId || cargando) return;
    if (sendingRef.current) cancelTurn();
    sendingRef.current = true;
    const epoch = epochRef.current;
    const file = soloTexto ? null : imagen?.file || null;
    const temporal = normalizarMensaje({remitente:"usuario",texto:text || "Analiza esta imagen médica.",imagen:soloTexto ? null : imagen?.preview || null});
    voice.beginTurn();
    voice.clearError();
    setMensajes(previous => [...previous, temporal]);
    setMensaje(""); setImagen(null); setEnviando(true); setError("");
    const socket = socketRef.current;
    if (!file && socket?.readyState === WebSocket.OPEN) {
      const bot = normalizarMensaje({remitente:"bot",texto:""});
      turnRef.current = {id:bot.id,chatId,buffer:"",requestId:temporal.id,websocket:true,text:temporal.texto,controller:new AbortController(),mark:latencyTrace(temporal.id)};
      playbackTraceRef.current = turnRef.current;
      setStreamingId(bot.id);
      setMensajes(previous => [...previous,bot]);
      try { socket.send(JSON.stringify({tipo:"mensaje",mensaje:temporal.texto,request_id:temporal.id})); }
      catch {
        turnRef.current = null; sendingRef.current = false; setEnviando(false); setStreamingId(null); voice.completeTurn();
        setMensajes(previous => previous.map(item => item.id === bot.id ? {...item,texto:"No fue posible enviar el mensaje. Intenta nuevamente.",error:true} : item));
      }
      return;
    }
    const bot = normalizarMensaje({remitente:"bot",texto:""});
    const restTurn = {id:bot.id, chatId, requestId:temporal.id, controller:new AbortController(), mark:latencyTrace(temporal.id)};
    turnRef.current = restTurn;
    playbackTraceRef.current = restTurn;
    setMensajes(previous => [...previous,bot]);
    try {
      const response = await bymaxService.enviarMensaje(chatId, temporal.texto, file, temporal.id, restTurn.controller.signal);
      if (epoch !== epochRef.current) return;
      restTurn.mark("first_text"); restTurn.mark("complete");
      setMensajes(previous => previous.map(item => item.id === bot.id ? {...item,texto:response.respuesta,resultado:response.resultado} : item));
      for (const unit of takeSpeechUnits(response.respuesta, true).units) voice.enqueue(unit, bot.id);
      setChats(previous => previous.map(chat => chat.id === chatId ? {...chat,ultima_interaccion:new Date().toISOString()} : chat));
    } catch (e) {
      if (epoch === epochRef.current) setMensajes(previous => previous.map(item => item.id === bot.id ? {...item,texto:e.message,error:true} : item));
    } finally {
      if (epoch === epochRef.current) { turnRef.current = null; sendingRef.current = false; setEnviando(false); voice.completeTurn(); }
    }
  }, [mensaje, imagen, chatId, cargando, voice, cancelTurn]);
  useEffect(() => { sendRef.current = enviarTexto; }, [enviarTexto]);
  useEffect(() => {
    const urls = imageUrls.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); };
  }, []);
  const seleccionarImagen = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { setError("Selecciona una imagen JPG, PNG o WEBP de máximo 8 MB."); return; }
    const preview = URL.createObjectURL(file);
    imageUrls.current.add(preview);
    setImagen({file,preview}); setError("");
  };
  const eliminarChat = async (id, event) => {
    event.stopPropagation();
    if (!window.confirm("¿Eliminar esta conversación?")) return;
    try {
      await bymaxService.eliminarChat(id);
      const remaining = chats.filter(chat => chat.id !== id);
      setChats(remaining);
      if (id === chatId) remaining.length ? cargarChat(remaining[0].id) : nuevoChat();
    } catch (e) { setError(e.message); }
  };
  const close = () => {
    setVentanaAbierta(false); setSidebar(false);
    requestAnimationFrame(() => launcherRef.current?.focus({preventScroll:true}));
  };
  const ultimo = mensajes.at(-1);
  const confirmation = Boolean(ultimo?.remitente === "bot" && (ultimo.resultado?.requires_confirmation || ultimo.resultado?.data?.requires_confirmation));
  confirmationRef.current = confirmation;
  const { status, label } = assistantState({ voice, sending: enviando, generating, loading: cargando, error, lastMessage: ultimo, connection });
  return <>
    <BymaxLauncher {...draggable} status={status} label={label} open={ventanaAbierta} buttonRef={launcherRef}/>
    <BymaxChatWindow open={ventanaAbierta} close={close} status={status} label={label} chats={chats} chatId={chatId} messages={mensajes} loading={cargando} sending={enviando} streamingId={streamingId}
      connection={connection} reconnect={() => setConnectionAttempt(value => value + 1)}
      modo={modo} identity={identity} onOpenClinical={() => {
        setVentanaAbierta(false);
        setCopilotoAbierto(true);
      }}
      sidebar={sidebar} setSidebar={setSidebar} loadChat={cargarChat} newChat={nuevoChat} deleteChat={eliminarChat} voice={voice} viewportStyle={viewportStyle}
      composer={{onCancel:cancelTurn,message:mensaje,setMessage:setMensaje,image:imagen,setImage:setImagen,error,clearError:() => {setError("");voice.clearError();},onSend:enviarTexto,onImage:seleccionarImagen,inputRef,fileRef,confirmation,unavailable:cargando || !chatId}}/>
    {modo === "medico" && <BymaxDoctorContext
      open={copilotoAbierto}
      close={() => setCopilotoAbierto(false)}
      chatId={chatId}
      disabled={cargando || enviando}
    />}
  </>;
}
