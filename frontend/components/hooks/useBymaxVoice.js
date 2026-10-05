"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBymaxVoiceController, DEFAULT_VOICE } from "../bymax/bymaxVoiceController.mjs";

const initialState = { mic: "off", active: false, playback: "idle", enabled: false, messageId: null, error: "", notice: "", supported: false };
export default function useBymaxVoice(options) {
  const latest = useRef(options);
  latest.current = options;
  const controller = useRef(null);
  const [state, setState] = useState(initialState);
  const [voices, setVoices] = useState([]);
  const [config, setConfig] = useState(DEFAULT_VOICE);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  const preference = useRef(false);
  const actor = options.actorKey;
  const save = useCallback((key, value) => {
    if (actor) { try { localStorage.setItem(`${key}:${actor}`, value); } catch {} }
  }, [actor]);
  useEffect(() => {
    if (!actor) return;
    initialized.current = false;
    let closed = false;
    const instance = createBymaxVoiceController({
      browser: window,
      notify: next => {
        setState(next);
        window.dispatchEvent(new CustomEvent("bymax:voice-state", { detail: { ...next, actor } }));
      },
      generateVoice: (...args) => latest.current.generateVoice(...args),
      onTranscript: text => latest.current.onTranscript(text),
      onPartial: text => latest.current.onPartial(text),
      onWake: () => latest.current.onWake(),
      onEnd: () => latest.current.onEnd?.(),
      isBusy: () => latest.current.isBusy(),
    });
    controller.current = instance;
    let saved;
    try {
      preference.current = localStorage.getItem(`bymax_voice_responses:${actor}`) === "true";
      saved = JSON.parse(localStorage.getItem(`bymax_configuracion_voz:${actor}`) || "null");
    } catch { preference.current = false; }
    const restored = saved ? {
      motor: saved.motor === "browser" ? "browser" : "neural",
      voiceURI: typeof saved.voiceURI === "string" ? saved.voiceURI : "",
      rate: Math.min(1.2, Math.max(0.75, Number(saved.rate) || 0.96)),
      pitch: Math.min(1.3, Math.max(0.75, Number(saved.pitch) || 1.02)),
      volume: Math.min(1, Math.max(0.2, Number(saved.volume) || 1)),
    } : DEFAULT_VOICE;
    setConfig(restored);
    instance.configure(restored);
    instance.setEnabled(preference.current);
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() || []);
    const publish = () => window.dispatchEvent(new CustomEvent("bymax:voice-state", { detail: closed ? null : { ...instance.snapshot(), actor } }));
    const command = event => {
      if (closed) return;
      const enabled = Boolean(event.detail?.enabled);
      initialized.current = true;
      preference.current = enabled;
      save("bymax_voice_responses", String(enabled));
      instance.setEnabled(enabled);
      if (enabled) instance.startListening("wake"); // Synchronous click from Configuration preserves user activation.
    };
    const shutdown = () => { closed = true; instance.dispose(); controller.current = null; setState(initialState); window.dispatchEvent(new CustomEvent("bymax:voice-state", {detail:null})); };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    const visibility = () => instance.setVisible(!document.hidden);
    const pageHide = () => instance.setVisible(false);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", visibility);
    window.addEventListener("bymax:voice-query", publish);
    window.addEventListener("bymax:voice-command", command);
    window.addEventListener("docsmart:session-ending", shutdown);
    setReady(true);
    return () => {
      shutdown();
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", visibility);
      window.removeEventListener("bymax:voice-query", publish);
      window.removeEventListener("bymax:voice-command", command);
      window.removeEventListener("docsmart:session-ending", shutdown);
    };
  }, [actor, save]);
  useEffect(() => { controller.current?.configure(config, voices); }, [config, voices]);
  useEffect(() => {
    if (!ready || !options.available || initialized.current || !controller.current) return;
    initialized.current = true;
    if (preference.current) controller.current.startListening("wake");
  }, [ready, options.available, actor]);
  const beginTurn = useCallback(() => controller.current?.beginTurn(), []);
  const completeTurn = useCallback(() => controller.current?.completeTurn(), []);
  const stopPlayback = useCallback(() => controller.current?.stopPlayback(), []);
  const play = useCallback((text, id) => controller.current?.play(text, id), []);
  const enqueue = useCallback((text, id) => controller.current?.enqueue(text, id), []);
  const clearError = useCallback(() => controller.current?.clearError(), []);
  const updateConfig = useCallback(next => {
    controller.current?.stopPlayback();
    setConfig(previous => { const value = { ...previous, ...next }; save("bymax_configuracion_voz", JSON.stringify(value)); return value; });
  }, [save]);
  return { ...state, config, voices, beginTurn, completeTurn, stopPlayback, play, enqueue, clearError, updateConfig };
}
