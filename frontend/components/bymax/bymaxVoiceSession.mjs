// One recognition object per mounted assistant. UI visibility is deliberately absent.
import { createDictation } from "./bymaxDictation.mjs";

const normalize = text => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim();
const wake = /^(?:(?:hey|hola|oye|ey)\s+)?(?:bymax|by max|baymax|bai max|bei max|vaimax)\b[\s,.:;!?¿¡]*/i;
export function isEndCommand(text) {
  const value = normalize(text.replace(wake, "")).replace(/^(?:por favor\s+)/, "").replace(/\s+por favor$/, "");
  return /^(?:(?:terminar|termina|finalizar|finaliza|cerrar|cierra|detener|deten|para)(?: la| el)? (?:conversacion|chat)|terminemos|ya terminamos|terminar|deja de escuchar|no quiero continuar|adios bymax|hasta luego bymax)$/.test(value);
}

// silenceMs: silence after the last result before the turn is closed.
// graceMs:   how long a provisional tail may wait for its final result.
// idleMs:    wait for the first words after the activation.
// maxTurnMs: a turn is never left open longer than this.
// stopMs:    wait for the recognizer to deliver its last result when closing.
export const DEFAULT_TIMING = { silenceMs: 1600, graceMs: 3200, idleMs: 20000, maxTurnMs: 180000, stopMs: 1500 };

export function createVoiceSession({ browser, notify, onTranscript, onPartial, onWake, onEnd, canListen, errors, timing: initialTiming }) {
  const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  const now = () => browser.performance?.now() ?? Date.now();
  let timing = { ...DEFAULT_TIMING, ...initialTiming };
  const dictation = createDictation();
  let recognition = null;
  let active = false, disposed = false, hidden = Boolean(browser.document?.hidden);
  let phase = "off", running = false, stopping = false, intentional = false, closing = false;
  let failures = 0, restartTimer, startTimer, stableTimer, quietTimer, idleTimer, turnTimer, closeTimer, endTimer;
  let conversation = false;
  let mode = "wake", sessionId = 0, lastResultAt = 0, metrics = {}, shown = "";
  const checked = new Set();
  const state = (mic, notice = "", error) => { phase = mic; if (!disposed) notify({mic, active, notice, ...(error !== undefined ? {error} : {})}); };
  const emitMetric = (event, elapsed) => {
    if (typeof browser.CustomEvent !== "function" || !browser.dispatchEvent) return;
    browser.dispatchEvent(new browser.CustomEvent("bymax:latency", { detail: { response_id: `dictation-${dictation.turnId}`, event, elapsed_ms: Math.round(elapsed * 100) / 100 } }));
  };
  const clearCapture = () => { for (const timer of [quietTimer, idleTimer, turnTimer, closeTimer]) browser.clearTimeout(timer); };
  const clearTimers = () => {
    clearCapture();
    for (const timer of [restartTimer, startTimer, stableTimer]) browser.clearTimeout(timer);
    restartTimer = null;
  };
  const resetTurn = () => { dictation.reset(); metrics = {}; checked.clear(); shown = ""; };

  // `discard: false` keeps what was dictated (errors, hidden page, playback).
  function pause(discard = true) {
    clearTimers();
    closing = false;
    if (discard) resetTurn(); else dictation.commitSession();
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
    conversation = false;
    pause();
    state(ended ? "ended" : "stopped", ended ? "Conversación terminada. Pulsa Activar para volver a escuchar." : "Micrófono desactivado. Pulsa Activar para escuchar «Bymax».");
  }
  function terminate() {
    conversation = false;
    mode = "wake";
    pause();
    onPartial("", dictation.view());
    onEnd();
    resume();
  }
  function fail(code) {
    active = false;
    const kept = dictation.view();
    pause(false);
    // What was already dictated stays in the field so it can be corrected and sent.
    if (kept.text) onPartial(kept.text, kept);
    state("error", "", errors[code] || "El reconocimiento se interrumpió varias veces. Pulsa Activar para volver a intentarlo.");
  }
  function resume(delay = 350) {
    if (disposed || !active || hidden || running || restartTimer != null || !canListen()) return;
    restartTimer = browser.setTimeout(() => { restartTimer = null; startCapture(); }, delay);
  }

  // ---- Turn lifecycle ------------------------------------------------------
  const armQuiet = () => { browser.clearTimeout(quietTimer); quietTimer = browser.setTimeout(onQuiet, timing.silenceMs); };
  const armIdle = () => {
    browser.clearTimeout(idleTimer);
    idleTimer = browser.setTimeout(() => { if (!dictation.hasText()) { pause(); resume(); } }, timing.idleMs);
  };
  function onQuiet() {
    if (!active || mode !== "request") return;
    const view = dictation.view();
    if (!view.text) return;
    // A provisional tail waits briefly for its final; if none arrives it is promoted.
    if (view.provisional) { quietTimer = browser.setTimeout(beginClose, Math.max(0, timing.graceMs - timing.silenceMs)); return; }
    beginClose();
  }
  // Orderly close: ask the recognizer to deliver its last result before sending.
  function beginClose() {
    if (closing || !active || mode !== "request") return;
    closing = true;
    browser.clearTimeout(quietTimer); browser.clearTimeout(idleTimer);
    state("listening", "Finalizando captura…");
    if (running && !stopping) {
      closeTimer = browser.setTimeout(finishTurn, timing.stopMs);
      try { recognition.stop(); } catch { finishTurn(); }
    } else finishTurn();
  }
  function finishTurn() {
    browser.clearTimeout(closeTimer);
    clearCapture();
    if (!closing) return;
    closing = false;
    dictation.commitSession();
    const text = dictation.finalText().trim();
    if (!text) { pause(); resume(); return; }
    if (isEndCommand(text)) { terminate(); return; }
    const meta = { turnId: dictation.turnId, sessionId, metrics: { ...metrics } };
    if (metrics.lastResult != null) emitMetric("speech_end_to_submit", now() - metrics.lastResult);
    resetTurn();
    pause(false);
    state("paused", "Procesando tu solicitud…");
    onTranscript(text, meta);
  }

  function enterRequest(firstIndex) {
    mode = "request";
    conversation = true;
    failures = 0;
    resetTurn();
    dictation.skipBefore(firstIndex);
    state("listening", "Te escucho. Dime tu solicitud.");
    onWake();
    armIdle();
  }

  function pick(result) {
    const alternatives = Array.from(result, item => item.transcript.trim());
    return alternatives.find(value => wake.test(value)) || alternatives[0] || "";
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
      if (mode === "request") { if (dictation.hasText()) armQuiet(); else armIdle(); }
    };
    recognition.onspeechstart = () => { if (mode === "request" && metrics.speechStart == null) metrics.speechStart = now(); };
    recognition.onresult = event => {
      if (disposed || !active || !running || (stopping && !closing) || hidden || !canListen()) return;
      const raw = Array.from(event.results, result => ({ text: pick(result), final: Boolean(result.isFinal) }));
      if (mode === "wake") {
        // The activation word is accepted from provisional results too, so the
        // first words of the request are visible immediately.
        const index = raw.findIndex(item => wake.test(item.text));
        if (index < 0) return;
        if (raw[index].final && isEndCommand(raw[index].text)) { terminate(); return; }
        enterRequest(index);
      }
      const items = raw.map(item => ({ ...item, text: item.text.replace(wake, "").trim() }));
      for (let index = 0; index < raw.length; index += 1) {
        if (!raw[index].final || checked.has(index)) continue;
        checked.add(index);
        if (isEndCommand(raw[index].text)) { terminate(); return; }
      }
      const view = dictation.ingest(sessionId, items);
      if (!view) return;
      lastResultAt = now();
      metrics.lastResult = lastResultAt;
      if (view.text && metrics.firstTranscript == null) {
        metrics.firstTranscript = lastResultAt;
        metrics.speechStart ??= lastResultAt;
        emitMetric("speech_to_first_transcript", lastResultAt - metrics.speechStart);
        browser.clearTimeout(turnTimer);
        turnTimer = browser.setTimeout(beginClose, timing.maxTurnMs);
      }
      if (view.text !== shown) { shown = view.text; onPartial(view.text, view); }
      if (view.text && !closing) armQuiet();
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
      if (closing) { finishTurn(); return; }
      // The recognizer ended on its own: keep what it heard and keep the turn
      // open. The silence timer decides when to send; nothing is dropped.
      dictation.commitSession();
      const keepTurn = !wasIntentional && mode === "request" && dictation.hasText();
      if (!keepTurn) clearCapture();
      if (!wasIntentional && !keepTurn) failures += 1;
      if (failures >= 4) { fail(); return; }
      mode = conversation ? "request" : "wake";
      state("recovering", "Reconectando la escucha…");
      resume(wasIntentional ? 350 : keepTurn ? 200 : Math.min(8000, 500 * 2 ** failures));
    };
    return recognition;
  }
  function startCapture() {
    if (disposed || !active || hidden || running || !canListen()) return;
    // A restart inside the same turn keeps the confirmed text.
    sessionId = dictation.beginSession();
    checked.clear();
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
    conversation = nextMode === "dictation";
    mode = conversation ? "request" : "wake";
    resetTurn();
    clearTimers();
    if (hidden) { state("suspended", "Vuelve a la página para activar la escucha."); return; }
    startCapture(); // No await before start: preserves a click's user activation.
  }
  function visibility(visible) {
    hidden = !visible;
    if (hidden) { if (active) pause(false); }
    else if (active) { mode = conversation ? "request" : "wake"; resume(); }
  }
  function dispose() {
    disposed = true;
    stop();
    clearTimers();
    browser.clearTimeout(endTimer);
    if (recognition) recognition.onstart = recognition.onspeechstart = recognition.onresult = recognition.onerror = recognition.onend = null;
  }
  return { start, stop, pause, resume, terminate, visibility, dispose, fail,
    configure: next => { timing = { ...timing, ...next }; },
    // The user edited the field: their text is the new base and older events
    // cannot overwrite it.
    manualEdit: text => { if (active && mode === "request") dictation.manualEdit(text); },
    discard: () => { const had = dictation.hasText(); clearCapture(); closing = false; resetTurn(); return had; },
    view: () => dictation.view(),
    snapshot: () => ({active, mic:phase}), supported: Boolean(Recognition) };
}
