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

// gate(text) decides what to do with speech heard while Bymax is answering (call mode):
// "accept" keeps it, "ignore" drops it (Bymax's own voice or noise) and "barge" is the
// user talking over the answer, so onBarge() cuts the audio before the text is kept.
export function createVoiceSession({ browser, notify, onTranscript, onPartial, onWake, onEnd, canListen, errors, timing: initialTiming, gate, onBarge }) {
  const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
  const now = () => browser.performance?.now() ?? Date.now();
  let timing = { ...DEFAULT_TIMING, ...initialTiming };
  const dictation = createDictation();
  let recognition = null;
  let active = false, disposed = false, hidden = Boolean(browser.document?.hidden);
  let phase = "off", running = false, stopping = false, intentional = false, closing = false;
  let failures = 0, restartTimer, startTimer, stableTimer, quietTimer, idleTimer, turnTimer, closeTimer, endTimer, recoverTimer;
  let conversation = false;
  let mode = "wake", sessionId = 0, lastResultAt = 0, metrics = {}, shown = "", rawLength = 0;
  // The browser closes a quiet microphone by itself (no-speech, or after a long silence). That is
  // normal while Bymax talks and the user listens, so it must not count as a failure.
  let startedAt = 0, benignEnd = false, errorCounted = false;
  const checked = new Set();
  const state = (mic, notice = "", error) => { phase = mic; if (!disposed) notify({mic, active, notice, ...(error !== undefined ? {error} : {})}); };
  const emitMetric = (event, elapsed) => {
    if (typeof browser.CustomEvent !== "function" || !browser.dispatchEvent) return;
    browser.dispatchEvent(new browser.CustomEvent("bymax:latency", { detail: { response_id: `dictation-${dictation.turnId}`, event, elapsed_ms: Math.round(elapsed * 100) / 100 } }));
  };
  const clearCapture = () => { for (const timer of [quietTimer, idleTimer, turnTimer, closeTimer]) browser.clearTimeout(timer); };
  const clearTimers = () => {
    clearCapture();
    for (const timer of [restartTimer, startTimer, stableTimer, recoverTimer]) browser.clearTimeout(timer);
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
        recoverRecognition();
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
  function resume(delay = 120) {
    if (disposed || !active || hidden || running || restartTimer != null || !canListen()) return;
    restartTimer = browser.setTimeout(() => { restartTimer = null; startCapture(); }, delay);
  }
  // A recognizer that keeps failing is replaced by a fresh one (the permission already granted is kept).
  function discardRecognition() {
    browser.clearTimeout(startTimer);
    browser.clearTimeout(stableTimer);
    const old = recognition;
    recognition = null;
    if (!old) return;
    old.onstart = old.onspeechstart = old.onresult = old.onerror = old.onend = null;
    try { old.abort(); } catch {}
    running = stopping = false;
  }
  function recoverRecognition() {
    if (disposed || !active) return;
    dictation.commitSession();
    for (const timer of [startTimer, stableTimer, endTimer, recoverTimer]) browser.clearTimeout(timer);
    discardRecognition();
    intentional = false;
    state("recovering", "Reconectando la escucha…");
    resume(Math.min(1500, 150 * 2 ** Math.min(failures, 3)));
  }
  // Supervisor: whatever event gets lost (an `end` that never arrives, a timer cleared by another
  // path), a session that should be listening and is not starts again within half a second.
  let supervising = false;
  function ensureListening() {
    if (disposed || !active || hidden || running || stopping || closing || restartTimer != null) return;
    if (["error", "stopped", "ended"].includes(phase) || !canListen()) return;
    startCapture();
  }
  function supervise() {
    if (supervising || disposed) return;
    supervising = true;
    const tick = () => browser.setTimeout(() => {
      if (disposed || !active) { supervising = false; return; }
      ensureListening();
      tick();
    }, 500);
    tick();
  }
  // «Reconectando la escucha…» never lasts long: if the microphone did not come back, rebuild the
  // recognizer and retry; only if that fails too it is said with an actionable message.
  function watchRecovery() {
    browser.clearTimeout(recoverTimer);
    recoverTimer = browser.setTimeout(() => {
      if (disposed || !active || phase !== "recovering" || running) return;
      restartTimer = null;
      discardRecognition();
      startCapture();
      recoverTimer = browser.setTimeout(() => { if (active && phase === "recovering" && !running) recoverRecognition(); }, 4000);
    }, 3000);
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
      startedAt = now(); benignEnd = false;
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
      rawLength = raw.length;
      if (gate && mode === "request") {
        const verdict = gate(raw.at(-1)?.text || "");
        // What was heard so far stays out of the turn, even if the recognizer rewrites it later.
        if (verdict === "ignore") { dictation.skipBefore(raw.length); return; }
        if (verdict === "barge") onBarge?.();
      }
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
      if (["no-speech", "aborted"].includes(event.error)) benignEnd = true;
      else { failures += 1; errorCounted = true; } // counted once: onend must not add it again
      {
        state("recovering", "El reconocimiento se interrumpió. Esperando su cierre…");
        browser.clearTimeout(startTimer);
        startTimer = browser.setTimeout(recoverRecognition, 3000);
      }
    };
    recognition.onend = () => {
      const wasIntentional = intentional;
      // A microphone that stayed open for a while, or closed on a quiet «no-speech», just rested.
      const natural = benignEnd || (startedAt > 0 && now() - startedAt >= 4000);
      const counted = errorCounted;
      benignEnd = false; startedAt = 0; errorCounted = false;
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
      if (!wasIntentional && !keepTurn) { if (natural) failures = 0; else if (!counted) failures += 1; }
      if (failures >= 2 && !wasIntentional && !natural) discardRecognition();
      mode = conversation ? "request" : "wake";
      if (canListen()) {
        state("recovering", "Reconectando la escucha…");
        watchRecovery();
      } else state("paused", ""); // Bymax is answering: listening returns by itself afterwards
      // Reconnect at once; only repeated immediate failures wait a little (never more than 1.5 s).
      resume(wasIntentional || natural ? 50 : keepTurn ? 100 : Math.min(1500, 150 * 2 ** failures));
    };
    return recognition;
  }
  function startCapture() {
    if (disposed || !active || hidden || running) return;
    if (!canListen()) return; // the supervisor starts it as soon as listening is allowed
    // A restart inside the same turn keeps the confirmed text.
    sessionId = dictation.beginSession();
    checked.clear();
    rawLength = 0; startedAt = 0; benignEnd = false;
    intentional = false;
    try {
      const instance = obtain();
      running = true;
      state("starting", "Preparando micrófono… Si el navegador lo solicita, permite el acceso.");
      startTimer = browser.setTimeout(() => { if (running) { failures += 1; recoverRecognition(); } }, 12000);
      instance.start();
    } catch (error) {
      // «Already started» (a previous session not fully closed): replace the recognizer and retry.
      if (error?.name === "InvalidStateError") {
        discardRecognition();
        state("recovering", "Reconectando la escucha…");
        resume(200);
        return;
      }
      failures += 1;
      recoverRecognition();
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
    supervise();
    startCapture(); // No await before start: preserves a click's user activation.
  }
  // Last resort for a call whose microphone stopped answering: a fresh recognizer, ignoring the old one.
  function hardRestart() {
    if (disposed || !active) return;
    clearTimers();
    if (recognition) {
      const old = recognition;
      recognition = null;
      old.onstart = old.onspeechstart = old.onresult = old.onerror = old.onend = null;
      try { old.abort(); } catch {}
    }
    running = stopping = closing = intentional = false;
    failures = 0;
    resume(100);
  }
  // Starts a conversation without the wake word. A session that is already listening
  // for «Bymax» switches mode in place, so the click's microphone permission is kept.
  function converse() {
    if (disposed) return;
    if (active && running && !stopping) { enterRequest(rawLength); return; }
    start("dictation");
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
  return { start, converse, hardRestart, stop, pause, resume, terminate, visibility, dispose, fail,
    configure: next => { timing = { ...timing, ...next }; },
    // The user edited the field: their text is the new base and older events
    // cannot overwrite it.
    manualEdit: text => { if (active && mode === "request") dictation.manualEdit(text); },
    discard: () => { const had = dictation.hasText(); clearCapture(); closing = false; resetTurn(); return had; },
    view: () => dictation.view(),
    snapshot: () => ({active, mic:phase}), supported: Boolean(Recognition) };
}
