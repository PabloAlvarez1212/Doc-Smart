import { attachProgressiveAudio } from "./bymaxProgressiveAudio.mjs";
import { createVoiceSession, DEFAULT_TIMING } from "./bymaxVoiceSession.mjs";
// Browser voice lifecycle. Dependencies are injected to test without microphone access.
export const DEFAULT_VOICE = { motor: "neural", voiceURI: "", rate: 0.96, pitch: 1.02, volume: 1, silencio: 1600 };
// A silent clip played inside a user gesture unlocks later automatic playback.
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
const MAX_QUEUED_UNITS = 6;
export const VOICE_ERRORS = {
  "not-allowed": "Permiso de micrófono denegado. Revisa los permisos del sitio y vuelve a tocar el micrófono.",
  "service-not-allowed": "El servicio de reconocimiento no está disponible. Revisa los permisos y la configuración de voz del dispositivo.",
  "audio-capture": "No se encontró un micrófono disponible. Revisa si otra aplicación lo está usando.",
  network: "No fue posible conectar con el servicio de reconocimiento. Revisa tu conexión y vuelve a intentarlo.",
  "language-not-supported": "El reconocimiento no admite español en este dispositivo.",
};

const plain = text => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();

export function createBymaxVoiceController({ browser, generateVoice, notify, onTranscript, onPartial, onWake, onEnd = () => {}, onBarge = () => {}, isBusy }) {
  const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  let state = { mic: "off", active: false, playback: "idle", enabled: true, messageId: null, notice: "", error: "", supported: Boolean(Recognition),
    call: false, muted: false, speechId: null, spokenText: "", speakingText: "" };
  let config = { ...DEFAULT_VOICE };
  // Call mode: the microphone stays open while Bymax answers, so the user can talk over it.
  let callMode = false;
  let muted = false;
  let enabledBeforeCall = false;
  let speechLog = { id: null, done: "" };
  let voices = [];
  let turnPending = false;
  let suspended = false;
  let ended = false;
  let voiceGeneration = 0;
  let queue = [];
  let current = null;
  let audio = null;
  let objectUrl = null;
  let closeProgressive = null;
  let utterance = null;

  let playbackTimer = null;
  let fetchTimer = null;
  let disposed = false;
  const engines = new Map();
  const mutedIds = new Set();
  const update = (next) => { state = { ...state, ...next }; if (!disposed) notify({ ...state }); };
  // Speech heard while Bymax is answering: its own voice and noise are dropped, a real
  // interruption cuts the audio. Words that Bymax is saying (or is about to say) count as echo.
  function isEcho(text) {
    const heard = plain(text);
    if (heard.length < 8) return true;
    const pool = plain([speechLog.done, current?.text, ...queue.map(item => item.text)].filter(Boolean).join(" "));
    const words = heard.split(" ").filter(word => word.length > 2);
    if (!words.length) return true;
    return words.filter(word => pool.includes(word)).length / words.length >= 0.7;
  }
  function callGate(text) {
    if (!callMode) return "accept";
    const answering = ["preparing", "starting", "speaking", "ready"].includes(state.playback) || Boolean(isBusy?.());
    if (!answering) return "accept";
    return isEcho(text) ? "ignore" : "barge";
  }
  function bargeIn() {
    if (!callMode) return;
    stopPlayback(false);
    onBarge();
  }
  // In a call the pause after the user stops talking is half of the usual one.
  function timingFor() {
    const base = Math.min(4000, Math.max(800, Number(config.silencio) || DEFAULT_VOICE.silencio));
    return callMode
      ? { silenceMs: Math.min(1200, Math.max(700, Math.round(base / 2))), graceMs: 2000, stopMs: 900, idleMs: 60000 }
      : { silenceMs: base, graceMs: DEFAULT_TIMING.graceMs, stopMs: DEFAULT_TIMING.stopMs, idleMs: DEFAULT_TIMING.idleMs };
  }
  const session = createVoiceSession({
    browser, errors: VOICE_ERRORS, notify: update, onPartial, onWake: () => { ended = false; onWake(); },
    onTranscript: (text, meta) => { beginTurn(); onTranscript(text, meta); if (callMode) session.resume(250); },
    onEnd: () => {
      ended = true; turnPending = false; stopPlayback(false);
      // Saying «terminar conversación» during a call hangs up.
      if (callMode) leaveCall(true);
      onEnd();
    },
    canListen: () => state.enabled && !muted && (callMode || (!turnPending && (!current || state.playback === "ready"))),
    gate: callGate, onBarge: bargeIn,
  });
  function startListening(mode = "wake") {
    if (disposed) return;
    if (isBusy?.()) turnPending = true;
    if (!state.enabled) return;
    ended = false;
    stopPlayback(false);
    session.start(mode);
  }
  function stopListening() { session.stop(); }
  function endConversation() { session.terminate(); }
  function restoreStopped(value) { ended = value; session.stop(value); }
  function permissionDenied() { session.fail("not-allowed"); }
  function beginTurn() { turnPending = true; if (!callMode) session.pause(); stopPlayback(false); }
  function completeTurn() { turnPending = false; session.resume(); }
  function setVisible(visible) {
    suspended = !visible;
    session.visibility(visible);
    if (!visible) stopPlayback(false);
  }

  function releaseAudio() {
    browser.clearTimeout(playbackTimer);
    closeProgressive?.(); closeProgressive = null;
    if (audio) {
      audio.onended = audio.onerror = audio.onplaying = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (objectUrl) browser.URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    if (utterance) {
      utterance.onstart = utterance.onend = utterance.onerror = null;
      browser.speechSynthesis?.cancel();
      utterance = null;
    }
  }

  function stopPlayback(announce = true) {
    for (const item of [current, ...queue]) if (item) { mutedIds.add(item.id); item.abort?.abort(); browser.clearTimeout(item.fetchTimer); }
    if (mutedIds.size > 100) mutedIds.delete(mutedIds.values().next().value);
    voiceGeneration += 1;
    browser.clearTimeout(fetchTimer);
    releaseAudio();
    queue = [];
    current = null;
    engines.clear();
    update({ playback: announce ? "stopped" : "idle", messageId: null, notice: "", speakingText: "" });
    if (announce) session.resume();
  }

  function finishPlayback(generation) {
    if (disposed || generation !== voiceGeneration) return;
    releaseAudio();
    if (current) speechLog = { id: current.id, done: `${speechLog.id === current.id ? speechLog.done : ""} ${current.text}`.trim() };
    current = null;
    update({ playback: "idle", messageId: null, notice: "Respuesta terminada.", speechId: speechLog.id, spokenText: speechLog.done, speakingText: "" });
    drain();
    session.resume();
  }

  function playbackError(generation, message, blocked = false) {
    if (disposed || generation !== voiceGeneration) return;
    browser.clearTimeout(playbackTimer);
    if (blocked) {
      // Never pretend it is playing: explain how to allow automatic audio.
      update({ playback: "ready", notice: "El navegador bloqueó el audio automático. Toca la pantalla una vez o permite el sonido del sitio (icono de candado de la barra de direcciones) para escuchar las respuestas sin pulsar nada." });
    } else {
      stopPlayback(false);
      update({ playback: "error", messageId: null, error: message });
    }
    session.resume();
  }

  function beginPlayback() {
    if (!current || disposed) return;
    if (!callMode) session.pause(false);
    const generation = voiceGeneration;
    const item = current;
    update({ playback: "starting", error: "", notice: "Iniciando reproducción…" });
    const started = () => {
      if (disposed || generation !== voiceGeneration) return;

      engines.set(item.id, item.engine);
      browser.dispatchEvent?.(new browser.CustomEvent("bymax:audio-timing", { detail: { response_id: item.id, event: "playing", at: browser.performance?.now() } }));
      update({ playback: "speaking", notice: "Reproduciendo respuesta…", speechId: item.id, spokenText: speechLog.id === item.id ? speechLog.done : "", speakingText: item.text });
      preloadNext();
      browser.clearTimeout(playbackTimer);
      playbackTimer = browser.setTimeout(() => playbackError(generation, "La reproducción se detuvo por tiempo máximo. Puedes reproducir el mensaje de nuevo."), 180000);
    };
    playbackTimer = browser.setTimeout(() => playbackError(generation, "La voz no pudo iniciarse. Intenta reproducirla de nuevo."), 12000);
    try {
      if (item.engine === "browser") {
        if (!browser.speechSynthesis || !browser.SpeechSynthesisUtterance) {
          playbackError(generation, "La voz del dispositivo no está disponible. Selecciona Bymax Neural o continúa leyendo.");
          return;
        }
        utterance = new browser.SpeechSynthesisUtterance(item.text);
        const selected = voices.find(voice => voice.voiceURI === config.voiceURI) || voices.find(voice => /^es[-_]CO$/i.test(voice.lang)) || voices.find(voice => /^es/i.test(voice.lang));
        if (selected) utterance.voice = selected;
        utterance.lang = selected?.lang || "es-CO";
        utterance.rate = Number(config.rate);
        utterance.pitch = Number(config.pitch);
        utterance.volume = Number(config.volume);
        utterance.onstart = started;
        utterance.onend = () => finishPlayback(generation);
        utterance.onerror = event => playbackError(generation, "No fue posible reproducir la voz del dispositivo.", event.error === "not-allowed");
        browser.speechSynthesis.speak(utterance);
      } else {
        audio.volume = Number(config.volume);
        audio.onplaying = started;
        audio.onended = () => { if (disposed || generation !== voiceGeneration) return; browser.dispatchEvent?.(new browser.CustomEvent("bymax:audio-timing", { detail: { response_id: item.id, event: "ended", at: browser.performance?.now() } })); finishPlayback(generation); };
        audio.onerror = () => playbackError(generation, "No fue posible reproducir el audio recibido. Inténtalo de nuevo.");
        const promise = audio.play();
        promise?.catch(error => playbackError(generation, "No fue posible reproducir el audio recibido.", error.name === "NotAllowedError"));
      }
    } catch (error) {
      playbackError(generation, "No fue posible iniciar la reproducción.", error.name === "NotAllowedError");
    }
  }

  function requestAudio(item) {
    if (item.prepared) return item.prepared;
    item.abort = typeof AbortController !== "undefined" ? new AbortController() : null;
    let requested;
    try { requested = generateVoice(item.text, Number(config.rate), item.abort?.signal); }
    catch (error) { requested = Promise.reject(error); }
    // A prefetched rejection is captured immediately, even before consumption.
    item.prepared = Promise.race([
      requested,
      new Promise((_, reject) => { item.fetchTimer = browser.setTimeout(() => { item.abort?.abort(); reject(new Error("voice-timeout")); }, 20000); }),
    ]).then(blob => ({ blob }), error => ({ error })).finally(() => browser.clearTimeout(item.fetchTimer));
    return item.prepared;
  }

  function preloadNext() {
    const next = queue[0];
    if (!current || !next || disposed || (engines.get(next.id) || config.motor) !== "neural") return;
    requestAudio(next);
  }

  async function prepare(item) {
    const generation = ++voiceGeneration;
    current = item;
    // The text already spoken restarts with every new response.
    if (speechLog.id !== item.id) speechLog = { id: item.id, done: "" };
    current.engine = engines.get(item.id) || config.motor;
    update({ playback: "preparing", messageId: item.id, error: "", notice: "Preparando respuesta por voz…" });
    preloadNext();
    if (current.engine === "neural") {
      try {
        const prepared = await requestAudio(item);
        if (prepared.error) throw prepared.error;
        const blob = prepared.blob;
        if (disposed || generation !== voiceGeneration) return;
        browser.clearTimeout(fetchTimer);
        if (!audio) audio = new browser.Audio();
        if (blob?.stream?.getReader) {
          const attached = attachProgressiveAudio({ browser, audio, stream: blob.stream, signal: item.abort?.signal, onError: () => playbackError(generation, "No fue posible reproducir el audio recibido.") });
          closeProgressive = attached.close;
          await attached.ready;
          if (disposed || generation !== voiceGeneration) return;
        } else {
          if (!blob || !blob.size || (blob.type && !/^(audio\/|application\/octet-stream)/i.test(blob.type))) throw new Error("invalid-audio");
          objectUrl = browser.URL.createObjectURL(blob);
          audio.src = objectUrl;
        }
      } catch {
        if (disposed || generation !== voiceGeneration) return;
        browser.clearTimeout(fetchTimer);
        // Never switch engines in the middle of an already spoken response.
        if (!engines.has(item.id) && browser.speechSynthesis && browser.SpeechSynthesisUtterance) {
          releaseAudio();
          current.engine = "browser";
          update({ notice: "La voz neuronal no está disponible. Pulsa Reproducir para usar la voz del dispositivo." });
          beginPlayback();
          return;
        }
        playbackError(generation, "No fue posible preparar la voz neuronal. El mensaje sigue disponible para leer.");
        return;
      }
    }
    if (disposed || generation !== voiceGeneration) return;
    // One real attempt; autoplay rejection is handled by a visible manual control.
    beginPlayback();
  }

  function drain() {
    if (disposed || current || !queue.length) return;
    prepare(queue.shift());
  }

  function enqueue(text, id) {
    if (!state.enabled || !text.trim() || disposed || ended || suspended || mutedIds.has(id)) return;
    const last = queue.at(-1);
    // A saturated queue merges new text into the last unit that has not been requested yet.
    if (queue.length >= MAX_QUEUED_UNITS && last && last.id === id && !last.prepared) last.text += ` ${text}`;
    else queue.push({ text, id });
    drain();
    preloadNext();
  }

  // «Escuchar» y «Probar voz» son pedidos explícitos: suenan aunque las respuestas
  // automáticas por voz estén apagadas en Configuración.
  function play(text, id) {
    if (disposed) return;
    if (current?.id === id && state.playback === "ready") { beginPlayback(); return; }
    stopPlayback(false);
    mutedIds.delete(id);
    speechLog = { id: null, done: "" };
    if (!callMode) session.pause(false);
    if (text.trim()) prepare({ text, id, direct: true });
  }

  function setEnabled(enabled) {
    if (!enabled && callMode) { callMode = false; muted = false; update({ call: false, muted: false }); }
    if (!enabled) { session.stop(); stopPlayback(false); }
    update({ enabled, error: "", notice: enabled ? "Voz habilitada. Actívala desde Configuración si el navegador requiere permiso." : "Voz desactivada." });
  }

  function configure(next, availableVoices = voices) {
    config = { ...config, ...next };
    voices = availableVoices;
    session.configure(timingFor());
  }

  // Starts a voice call. It must run inside a click: the microphone and the audio need that gesture.
  // A call must never go deaf: if the microphone is not listening for a few seconds, it restarts with a fresh recognizer.
  let watchTimer = null, lastListening = 0;
  const clock = () => browser.performance?.now() ?? Date.now();
  function watch() {
    watchTimer = null;
    if (!callMode || disposed) return;
    const mic = state.mic;
    if (muted || suspended || mic === "listening" || mic === "error" || mic === "stopped") lastListening = clock();
    else if (clock() - lastListening > 5000) { lastListening = clock(); session.hardRestart(); }
    watchTimer = browser.setTimeout(watch, 1500);
  }
  function stopWatch() { browser.clearTimeout(watchTimer); watchTimer = null; }
  function startCall() {
    if (disposed || callMode) return;
    enabledBeforeCall = state.enabled;
    callMode = true; muted = false; ended = false; turnPending = false;
    stopPlayback(false);
    speechLog = { id: null, done: "" };
    update({ enabled: true, call: true, muted: false, error: "", notice: "Llamada iniciada. Habla cuando quieras.", spokenText: "", speakingText: "" });
    unlockAudio();
    session.configure(timingFor());
    session.converse();
    lastListening = clock();
    stopWatch();
    watchTimer = browser.setTimeout(watch, 1500);
  }
  // Hang-up, or the «terminar conversación» command (fromEnd: the session is already going back to «Bymax»).
  function leaveCall(fromEnd = false) {
    if (!callMode) return;
    callMode = false; muted = false;
    stopWatch();
    session.configure(timingFor());
    stopPlayback(false);
    update({ call: false, muted: false });
    // Voice answers were already on: go back to waiting for «Bymax».
    if (enabledBeforeCall) { if (!fromEnd) session.terminate(); return; }
    setEnabled(false);
  }
  function setMuted(next) {
    if (!callMode || muted === next) return;
    muted = next;
    update({ muted });
    if (muted) session.pause(false); else session.resume(150);
  }

  // Called from a user gesture: prepares one reusable audio element and, when a
  // response was blocked, plays it now.
  let unlocked = false;
  function unlockAudio() {
    if (disposed) return;
    if (!unlocked && !current && browser.Audio) {
      try {
        if (!audio) audio = new browser.Audio();
        audio.src = SILENT_WAV;
        const attempt = audio.play();
        if (attempt?.then) attempt.then(() => { unlocked = true; if (!current) { audio.pause(); audio.removeAttribute?.("src"); } }).catch(() => {});
        else unlocked = true;
      } catch {}
    }
    if (current && state.playback === "ready") beginPlayback();
  }

  function dispose() {
    disposed = true;
    stopWatch();
    session.dispose();
    stopPlayback(false);
  }

  return { startListening, stopListening, endConversation, restoreStopped, permissionDenied, beginTurn, completeTurn, setVisible, stopPlayback, play, enqueue, setEnabled, configure, dispose,
    startCall, endCall: () => leaveCall(false), setMuted, interrupt: bargeIn,
    unlockAudio, manualEdit: text => session.manualEdit(text), discardDictation: () => session.discard(),
    snapshot: () => ({ ...state }), clearError: () => update({ error: "", notice: "" }) };
}
