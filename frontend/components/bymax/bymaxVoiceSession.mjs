// One recognition object per mounted assistant. UI visibility is deliberately absent.
const normalize = text => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim();
const wake = /^(?:(?:hey|hola|oye|ey)\s+)?(?:bymax|by max|baymax|bai max|bei max|vaimax)\b[\s,.:;!?¿¡]*/i;
export function isEndCommand(text) {
  const value = normalize(text.replace(wake, "")).replace(/^(?:por favor\s+)/, "").replace(/\s+por favor$/, "");
  return /^(?:(?:terminar|termina|finalizar|finaliza|detener|deten|para)(?: la)? conversacion|terminemos|ya terminamos|terminar|deja de escuchar|no quiero continuar|adios bymax|hasta luego bymax)$/.test(value);
}

export function createVoiceSession({ browser, notify, onTranscript, onPartial, onWake, onEnd, canListen, errors }) {
  const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  const now = () => browser.performance?.now() ?? Date.now();
  let recognition = null;
  let active = false, disposed = false, hidden = Boolean(browser.document?.hidden);
  let phase = "off", running = false, stopping = false, intentional = false;
  let failures = 0, restartTimer, startTimer, stableTimer, quietTimer, requestTimer, endTimer;
  let mode = "wake", request = "", lastFinal = -1, interim = "", requestDeadline = 0;
  const state = (mic, notice = "", error) => { phase = mic; if (!disposed) notify({mic, active, notice, ...(error !== undefined ? {error} : {})}); };
  const clearCapture = () => { browser.clearTimeout(quietTimer); browser.clearTimeout(requestTimer); };
  const clearTimers = () => {
    clearCapture();
    for (const timer of [restartTimer, startTimer, stableTimer]) browser.clearTimeout(timer);
    restartTimer = null;
  };
  function pause() {
    clearTimers();
    request = interim = "";
    intentional = true;
    if (running && !stopping) {
      stopping = true;
      endTimer = browser.setTimeout(() => {
        if (!running) return;
        if (phase === "ended" || phase === "stopped") return;
        active = false;
        state("error", "", "El navegador no confirmó el cierre del micrófono. Recarga la página para volver a activarlo.");
      }, 3000);
      try { recognition.abort(); } catch { running = stopping = false; }
    }
    if (active) state(hidden ? "suspended" : "paused", hidden ? "Escucha suspendida mientras la página no está visible." : "");
  }
  function stop(ended = false) {
    active = false;
    pause();
    state(ended ? "ended" : "stopped", ended ? "Conversación terminada. Pulsa Activar para volver a escuchar." : "Micrófono desactivado. Pulsa Activar para escuchar «Bymax».");
  }
  function terminate() { stop(true); onEnd(); }
  function fail(code) {
    active = false;
    pause();
    state("error", "", errors[code] || "El reconocimiento se interrumpió varias veces. Pulsa Activar para volver a intentarlo.");
  }
  function resume(delay = 350) {
    if (disposed || !active || hidden || running || restartTimer != null || !canListen()) return;
    restartTimer = browser.setTimeout(() => { restartTimer = null; startCapture(); }, delay);
  }
  function submit() {
    const text = request.trim();
    if (!active || mode !== "request" || !text) return;
    if (isEndCommand(text)) { terminate(); return; }
    pause();
    state("paused", "Procesando tu solicitud…");
    onTranscript(text);
  }
  function armRequest() {
    browser.clearTimeout(requestTimer);
    requestTimer = browser.setTimeout(() => {
      if (request.trim()) submit();
      else { pause(); mode = "wake"; resume(); }
    }, Math.max(0, requestDeadline - now()));
  }
  function settleRequest() {
    browser.clearTimeout(quietTimer);
    quietTimer = browser.setTimeout(() => {
      // A partial result is never sent as if it were a confirmed transcript.
      if (!interim) submit();
    }, 1600);
  }
  function obtain() {
    if (recognition) return recognition;
    recognition = new Recognition();
    recognition.lang = "es-CO";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onstart = () => {
      if (disposed || stopping || !active || hidden) return;
      browser.clearTimeout(startTimer);
      state(mode === "request" ? "listening" : "waiting", mode === "request" ? "Te escucho. Dime tu solicitud." : "Esperando activación: di «Bymax».");
      stableTimer = browser.setTimeout(() => { failures = 0; }, 10000);
      if (mode === "request") armRequest();
    };
    recognition.onresult = event => {
      if (disposed || !active || !running || stopping || hidden || !canListen()) return;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternatives = Array.from(result, item => item.transcript.trim());
        let text = alternatives.find(value => wake.test(value)) || alternatives[0] || "";
        if (!result.isFinal) {
          if (mode === "request") { interim = text; onPartial([request, text].filter(Boolean).join(" ")); settleRequest(); }
          continue;
        }
        if (index <= lastFinal) continue;
        lastFinal = index;
        interim = "";
        const match = text.match(wake);
        // Bare, ambiguous 'terminar' is not acted on in ambient conversation.
        if ((mode === "request" || match || normalize(text) !== "terminar") && isEndCommand(text)) { terminate(); return; }
        if (mode === "wake") {
          if (!match) continue;
          mode = "request";
          requestDeadline = now() + 20000;
          failures = 0;
          request = "";
          text = text.slice(match[0].length).trim();
          state("listening", "Te escucho. Dime tu solicitud.");
          onWake();
          armRequest();
        }
        request = [request, text].filter(Boolean).join(" ");
        if (request) { onPartial(request); settleRequest(); }
      }
    };
    recognition.onerror = event => {
      if (disposed || intentional || !active) return;
      if (["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(event.error)) { fail(event.error); return; }
      // Recover only after onend releases the existing microphone session.
      if (!["no-speech", "aborted"].includes(event.error)) failures += 1;
      if (failures >= 4) fail(event.error);
      else {
        state("recovering", "El reconocimiento se interrumpió. Esperando su cierre…");
        browser.clearTimeout(startTimer);
        startTimer = browser.setTimeout(() => fail(event.error), 3000);
      }
    };
    recognition.onend = () => {
      const wasIntentional = intentional;
      running = stopping = false;
      browser.clearTimeout(endTimer);
      intentional = false;
      browser.clearTimeout(startTimer);
      browser.clearTimeout(stableTimer);
      if (disposed || !active || hidden) return;
      if (!wasIntentional && mode === "request" && request.trim()) { submit(); return; }
      clearCapture();
      if (!wasIntentional) failures += 1;
      if (failures >= 4) { fail(); return; }
      if (wasIntentional || mode !== "request" || now() >= requestDeadline) mode = "wake";
      state("recovering", "Reconectando la escucha…");
      resume(wasIntentional ? 350 : Math.min(8000, 500 * 2 ** failures));
    };
    return recognition;
  }
  function startCapture() {
    if (disposed || !active || hidden || running || !canListen()) return;
    request = interim = "";
    lastFinal = -1;
    intentional = false;
    try {
      const instance = obtain();
      running = true;
      state("starting", "Preparando micrófono… Si el navegador lo solicita, permite el acceso.");
      startTimer = browser.setTimeout(() => { if (running) fail("start-timeout"); }, 12000);
      instance.start();
    } catch {
      running = false;
      fail("start-timeout");
    }
  }
  function start(nextMode = "wake") {
    if (disposed) return;
    if (!Recognition) { state("error", "", "El reconocimiento de voz no está disponible en este navegador. Puedes seguir escribiendo."); return; }
    if (!browser.isSecureContext) { state("error", "", "El micrófono necesita HTTPS o localhost para pruebas."); return; }
    if (active && running && !stopping) return;
    if (stopping) { state("error", "", "El micrófono todavía se está cerrando. Espera unos segundos; si persiste, recarga la página."); return; }
    active = true;
    state("starting", "Preparando escucha…", "");
    failures = 0;
    mode = nextMode === "dictation" ? "request" : "wake";
    if (mode === "request") requestDeadline = now() + 20000;
    clearTimers();
    if (hidden) { state("suspended", "Vuelve a la página para activar la escucha."); return; }
    startCapture(); // No await before start: preserves a click's user activation.
  }
  function visibility(visible) {
    hidden = !visible;
    if (hidden) { if (active) pause(); }
    else if (active) { mode = "wake"; resume(); }
  }
  function dispose() {
    disposed = true;
    stop();
    browser.clearTimeout(endTimer);
    if (recognition) recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
  }
  return { start, stop, pause, resume, terminate, visibility, dispose, fail,
    snapshot: () => ({active, mic:phase}), supported: Boolean(Recognition) };
}
