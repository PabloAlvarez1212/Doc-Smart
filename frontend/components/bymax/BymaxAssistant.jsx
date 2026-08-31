"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { bymaxService } from "@/app/services/bymaxServices";
import useBymaxVoice from "../hooks/useBymaxVoice";
import useDraggableAssistant from "../hooks/useDraggableAssistant";
import useBymaxViewport from "./useBymaxViewport";
import BymaxLauncher from "./BymaxLauncher";
import BymaxChatWindow from "./BymaxChatWindow";

const SALUDO = "Hola, soy Bymax, tu asistente virtual de DocSmart. ¿En qué puedo ayudarte hoy?";
function normalizarMensaje(item) {
  return {
    id: item.id || crypto.randomUUID(),
    remitente: item.es_bot ? "bot" : (item.remitente || "usuario"),
    texto: String(item.contenido ?? item.texto ?? ""),
    fecha: item.fecha || new Date().toISOString(),
    resultado: item.resultado || null, imagen: item.imagen || null, error: Boolean(item.error),
  };
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
  const [streamingId, setStreamingId] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const [error, setError] = useState("");
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
  const abrirVentana = useCallback(() => { setVentanaAbierta(true); }, []);
  const voice = useBymaxVoice({
    generateVoice: bymaxService.generarVoz,
    available: Boolean(chatId) && !cargando,
    onEnd: () => setMensajes(previous => [...previous, normalizarMensaje({remitente:"bot", texto:"De acuerdo. He terminado la conversación."})]),
    onTranscript: text => sendRef.current?.(text),
    onPartial: setMensaje, onWake: abrirVentana,
    isBusy: () => sendingRef.current || cargando || !chatId,
  });
  useEffect(() => { voiceRef.current = voice; }, [voice]);
  const viewportStyle = useBymaxViewport();
  const draggable = useDraggableAssistant(abrirVentana);
  useEffect(() => {
    window.addEventListener("bymax:open", abrirVentana);
    return () => window.removeEventListener("bymax:open", abrirVentana);
  }, [abrirVentana]);

  const resetInteraction = useCallback(() => {
    epochRef.current += 1;
    turnRef.current = null;
    sendingRef.current = false;
    setEnviando(false);
    setStreamingId(null);
    voiceRef.current?.beginTurn();
  }, []);
  const cargarChat = useCallback(async id => {
    resetInteraction();
    const epoch = epochRef.current;
    setCargando(true);
    setError("");
    try {
      const data = await bymaxService.obtenerMensajes(id);
      if (epoch !== epochRef.current) return;
      setChatId(id);
      setMensajes(data.length ? data.map(normalizarMensaje) : [normalizarMensaje({remitente:"bot", texto:SALUDO})]);
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
      setMensajes([normalizarMensaje({remitente:"bot",texto:SALUDO})]);
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
    return () => { cancelled = true; epochRef.current += 1; };
  }, [cargarChat, nuevoChat]);

  useEffect(() => {
    if (!chatId) return;
    const socket = bymaxService.crearSocket(chatId);
    socketRef.current = socket;
    function finish() {
      turnRef.current = null;
      sendingRef.current = false;
      setEnviando(false);
      setStreamingId(null);
      voiceRef.current?.completeTurn();
    }
    function speakFragments(turn, final = false) {
      const pattern = /^([\s\S]*?[.!?…](?:\s+|$))/;
      let match;
      while ((match = turn.buffer.match(pattern))) {
        voiceRef.current?.enqueue(match[1], turn.id);
        turn.buffer = turn.buffer.slice(match[1].length);
      }
      if (final && turn.buffer.trim()) { voiceRef.current?.enqueue(turn.buffer, turn.id); turn.buffer = ""; }
    }
    socket.onmessage = event => {
      const turn = turnRef.current;
      if (!turn || turn.chatId !== chatId) return;
      let data;
      try { data = JSON.parse(event.data); } catch { setError("Recibí una respuesta que no pude interpretar."); finish(); return; }
      if (data.tipo === "texto") {
        const fragment = String(data.contenido || "");
        turn.buffer += fragment;
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:item.texto + fragment} : item));
        speakFragments(turn);
      } else if (data.tipo === "fin") {
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,resultado:data.resultado || item.resultado} : item));
        speakFragments(turn, true);
        setChats(previous => previous.map(chat => chat.id === chatId ? {...chat,ultima_interaccion:new Date().toISOString()} : chat));
        finish();
      } else if (data.tipo === "error") {
        voiceRef.current?.stopPlayback();
        setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:data.mensaje || "No fue posible completar la respuesta.",error:true} : item));
        finish();
      }
    };
    socket.onerror = () => setError("Se perdió la conexión en tiempo real con Bymax.");
    socket.onclose = () => {
      const turn = turnRef.current;
      if (turn?.chatId !== chatId) return;
      voiceRef.current?.stopPlayback();
      setMensajes(previous => previous.map(item => item.id === turn.id ? {...item,texto:item.texto || "La conexión con Bymax se cerró. Intenta nuevamente.",error:true} : item));
      finish();
    };
    return () => {
      socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [chatId]);

  const enviarTexto = useCallback(async forced => {
    const text = String(forced ?? mensaje).trim();
    if ((!text && !imagen) || sendingRef.current || !chatId || cargando) return;
    sendingRef.current = true;
    const epoch = epochRef.current;
    const file = imagen?.file || null;
    const temporal = normalizarMensaje({remitente:"usuario",texto:text || "Analiza esta imagen médica.",imagen:imagen?.preview || null});
    voice.beginTurn();
    voice.clearError();
    setMensajes(previous => [...previous, temporal]);
    setMensaje(""); setImagen(null); setEnviando(true); setError("");
    const socket = socketRef.current;
    if (!file && socket?.readyState === WebSocket.OPEN) {
      const bot = normalizarMensaje({remitente:"bot",texto:""});
      turnRef.current = {id:bot.id,chatId,buffer:""};
      setStreamingId(bot.id);
      setMensajes(previous => [...previous,bot]);
      try { socket.send(JSON.stringify({tipo:"mensaje",mensaje:temporal.texto})); }
      catch {
        turnRef.current = null; sendingRef.current = false; setEnviando(false); setStreamingId(null); voice.completeTurn();
        setMensajes(previous => previous.map(item => item.id === bot.id ? {...item,texto:"No fue posible enviar el mensaje. Intenta nuevamente.",error:true} : item));
      }
      return;
    }
    try {
      const response = await bymaxService.enviarMensaje(chatId, temporal.texto, file);
      if (epoch !== epochRef.current) return;
      const bot = normalizarMensaje({remitente:"bot",texto:response.respuesta,resultado:response.resultado});
      setMensajes(previous => [...previous,bot]);
      voice.enqueue(bot.texto, bot.id);
      setChats(previous => previous.map(chat => chat.id === chatId ? {...chat,ultima_interaccion:new Date().toISOString()} : chat));
    } catch (e) {
      if (epoch === epochRef.current) setMensajes(previous => [...previous,normalizarMensaje({remitente:"bot",texto:e.message,error:true})]);
    } finally {
      if (epoch === epochRef.current) { sendingRef.current = false; setEnviando(false); voice.completeTurn(); }
    }
  }, [mensaje, imagen, chatId, cargando, voice]);
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
  const status = voice.mic === "ended" ? "ended" : error || voice.error ? "error" : voice.mic === "suspended" ? "suspended" : voice.playback === "speaking" || voice.playback === "starting" ? "speaking" : enviando || voice.playback === "preparing" ? "processing" : voice.mic === "waiting" ? "waiting" : voice.mic === "listening" ? "listening" : voice.mic === "starting" || voice.mic === "recovering" ? "recovering" : "off";
  const label = {ended:"Conversación terminada",error:"Necesito tu atención",suspended:"Escucha suspendida",waiting:"Esperando «Bymax»",listening:"Escuchando solicitud…",speaking:"Hablando…",processing:"Procesando…",recovering:"Preparando escucha…",off:"Micrófono desactivado"}[status];
  return <>
    <BymaxLauncher {...draggable} status={status} label={label} open={ventanaAbierta} buttonRef={launcherRef}/>
    <BymaxChatWindow open={ventanaAbierta} close={close} status={status} label={label} chats={chats} chatId={chatId} messages={mensajes} loading={cargando} sending={enviando} streamingId={streamingId}
      sidebar={sidebar} setSidebar={setSidebar} loadChat={cargarChat} newChat={nuevoChat} deleteChat={eliminarChat} voice={voice} viewportStyle={viewportStyle}
      composer={{message:mensaje,setMessage:setMensaje,image:imagen,setImage:setImagen,error,clearError:() => {setError("");voice.clearError();},onSend:enviarTexto,onImage:seleccionarImagen,inputRef,fileRef,confirmation}}/>
  </>;
}
