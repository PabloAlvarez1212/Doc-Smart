import { createVoiceSession } from "./bymaxVoiceSession.mjs";
// Browser voice lifecycle. Dependencies are injected to test without microphone access.
export const DEFAULT_VOICE = { motor: "neural", voiceURI: "", rate: 0.96, pitch: 1.02, volume: 1 };
export const VOICE_ERRORS = {
  "not-allowed": "Permiso de micrófono denegado. Revisa los permisos del sitio y vuelve a tocar el micrófono.",
  "service-not-allowed": "El servicio de reconocimiento no está disponible. Revisa los permisos y la configuración de voz del dispositivo.",
  "audio-capture": "No se encontró un micrófono disponible. Revisa si otra aplicación lo está usando.",
  network: "No fue posible conectar con el servicio de reconocimiento. Revisa tu conexión y vuelve a intentarlo.",
  "language-not-supported": "El reconocimiento no admite español en este dispositivo.",
};

export function createBymaxVoiceController({ browser, generateVoice, notify, onTranscript, onPartial, onWake, onEnd = () => {}, isBusy }) {
  const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  let state = { mic: "off", active: false, playback: "idle", enabled: true, messageId: null, notice: "", error: "", supported: Boolean(Recognition) };
  let config = { ...DEFAULT_VOICE };
  let voices = [];
  let turnPending = false;
  let suspended = false;
  let ended = false;
  let voiceGeneration = 0;
  let queue = [];
  let current = null;
  let audio = null;
  let objectUrl = null;
  let utterance = null;

  let playbackTimer = null;
  let fetchTimer = null;
  let disposed = false;
  const engines = new Map();
  const mutedIds = new Set();
  const update = (next) => { state = { ...state, ...next }; if (!disposed) notify({ ...state }); };
  const session = createVoiceSession({
    browser, errors: VOICE_ERRORS, notify: update, onPartial, onWake,
    onTranscript: text => { beginTurn(); onTranscript(text); },
    onEnd: () => {
      ended = true; turnPending = false; stopPlayback(false); onEnd();
      if (state.enabled && browser.speechSynthesis && browser.SpeechSynthesisUtterance && !suspended) {
        current = {id:"session-ended", text:"De acuerdo. He terminado la conversación.", engine:"browser"};
        update({messageId:current.id});
        beginPlayback();
      }
    },
    canListen: () => !turnPending && (!current || state.playback === "ready"),
  });
  function startListening(mode = "wake") {
    if (disposed) return;
    if (isBusy?.()) { update({notice:"Espera a que Bymax termine de procesar para activar el micrófono."}); return; }
    ended = false;
    stopPlayback(false);
    session.start(mode);
  }
  function stopListening() { session.stop(); }
  function endConversation() { session.terminate(); }
  function restoreStopped(value) { ended = value; session.stop(value); }
  function permissionDenied() { session.fail("not-allowed"); }
  function beginTurn() { turnPending = true; session.pause(); stopPlayback(false); }
  function completeTurn() { turnPending = false; session.resume(); }
  function setVisible(visible) {
    suspended = !visible;
    session.visibility(visible);
    if (!visible) stopPlayback(false);
  }

  function releaseAudio() {
    browser.clearTimeout(playbackTimer);
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
    for (const item of [current, ...queue]) if (item) mutedIds.add(item.id);
    if (mutedIds.size > 100) mutedIds.delete(mutedIds.values().next().value);
    voiceGeneration += 1;
    browser.clearTimeout(fetchTimer);
    releaseAudio();
    queue = [];
    current = null;
    engines.clear();
    update({ playback: announce ? "stopped" : "idle", messageId: null, notice: "" });
    if (announce) session.resume();
  }

  function finishPlayback(generation) {
    if (disposed || generation !== voiceGeneration) return;
    releaseAudio();
    current = null;
    update({ playback: "idle", messageId: null, notice: "Respuesta terminada." });
    drain();
    session.resume();
  }

  function playbackError(generation, message, blocked = false) {
    if (disposed || generation !== voiceGeneration) return;
    browser.clearTimeout(playbackTimer);
    if (blocked) {

      update({ playback: "ready", notice: "El navegador requiere un toque. Pulsa Reproducir para escuchar la respuesta." });
    } else {
      releaseAudio();
      if (current) mutedIds.add(current.id);
      queue = [];
      current = null;
      update({ playback: "error", messageId: null, error: message });
    }
    session.resume();
  }

  function beginPlayback() {
    if (!current || disposed) return;
    session.pause();
    const generation = voiceGeneration;
    const item = current;
    update({ playback: "starting", error: "", notice: "Iniciando reproducción…" });
    const started = () => {
      if (disposed || generation !== voiceGeneration) return;

      engines.set(item.id, item.engine);
      update({ playback: "speaking", notice: "Reproduciendo respuesta…" });
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
        audio.onended = () => finishPlayback(generation);
        audio.onerror = () => playbackError(generation, "No fue posible reproducir el audio recibido. Inténtalo de nuevo.");
        const promise = audio.play();
        promise?.catch(error => playbackError(generation, "No fue posible reproducir el audio recibido.", error.name === "NotAllowedError"));
      }
    } catch (error) {
      playbackError(generation, "No fue posible iniciar la reproducción.", error.name === "NotAllowedError");
    }
  }

  async function prepare(item) {
    const generation = ++voiceGeneration;
    current = { ...item, engine: engines.get(item.id) || config.motor };
    update({ playback: "preparing", messageId: item.id, error: "", notice: "Preparando respuesta por voz…" });
    if (current.engine === "neural") {
      try {
        const blob = await Promise.race([
          generateVoice(item.text, Number(config.rate)),
          new Promise((_, reject) => { fetchTimer = browser.setTimeout(() => reject(new Error("voice-timeout")), 20000); }),
        ]);
        if (disposed || generation !== voiceGeneration) return;
        browser.clearTimeout(fetchTimer);
        if (!blob || !blob.size || (blob.type && !/^(audio\/|application\/octet-stream)/i.test(blob.type))) throw new Error("invalid-audio");
        if (!audio) audio = new browser.Audio();
        objectUrl = browser.URL.createObjectURL(blob);
        audio.src = objectUrl;
      } catch {
        if (disposed || generation !== voiceGeneration) return;
        browser.clearTimeout(fetchTimer);
        // Never switch engines in the middle of an already spoken response.
        if (!engines.has(item.id) && browser.speechSynthesis && browser.SpeechSynthesisUtterance) {
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
    queue.push({ text, id });
    drain();
  }

  function play(text, id) {
    if (disposed) return;
    if (current?.id === id && state.playback === "ready") { beginPlayback(); return; }
    stopPlayback(false);
    mutedIds.delete(id);
    session.pause();
    if (text.trim()) prepare({ text, id, direct: true });
  }

  function setEnabled(enabled) {
    if (!enabled) stopPlayback();
    update({ enabled, error: "", notice: enabled ? "Respuestas por voz activadas." : "Respuestas por voz desactivadas." });
  }

  function configure(next, availableVoices = voices) {
    config = { ...config, ...next };
    voices = availableVoices;
  }

  function dispose() {
    disposed = true;
    session.dispose();
    stopPlayback(false);
  }

  return { startListening, stopListening, endConversation, restoreStopped, permissionDenied, beginTurn, completeTurn, setVisible, stopPlayback, play, enqueue, setEnabled, configure, dispose,
    snapshot: () => ({ ...state }), clearError: () => update({ error: "", notice: "" }) };
}
