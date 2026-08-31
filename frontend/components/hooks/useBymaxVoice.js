"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBymaxVoiceController, DEFAULT_VOICE } from "../bymax/bymaxVoiceController.mjs";

export default function useBymaxVoice(options) {
  const latest = useRef(options);
  const controller = useRef(null);
  const [state, setState] = useState({ mic: "off", active: false, playback: "idle", enabled: true, messageId: null, error: "", notice: "", supported: false });
  const initialized = useRef(false);
  const interaction = useRef(0);
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const [voices, setVoices] = useState([]);
  const [config, setConfig] = useState(DEFAULT_VOICE);
  const [ready, setReady] = useState(false);
  useEffect(() => { latest.current = options; }, [options]);
  useEffect(() => {
    const instance = createBymaxVoiceController({
      browser: window, notify: setState,
      generateVoice: (...args) => latest.current.generateVoice(...args),
      onTranscript: text => latest.current.onTranscript(text),
      onPartial: text => latest.current.onPartial(text),
      onWake: () => latest.current.onWake(),
      onEnd: () => { save("bymax_voice_session", "ended"); latest.current.onEnd?.(); },
      isBusy: () => latest.current.isBusy(),
    });
    controller.current = instance;
    setState(instance.snapshot());
    try {
      if (localStorage.getItem("bymax_voice_responses") === "false") instance.setEnabled(false);
      const saved = JSON.parse(localStorage.getItem("bymax_configuracion_voz") || "null");
      if (saved) setConfig({
        motor: saved.motor === "browser" ? "browser" : "neural",
        voiceURI: typeof saved.voiceURI === "string" ? saved.voiceURI : "",
        rate: Math.min(1.2, Math.max(0.75, Number(saved.rate) || 0.96)),
        pitch: Math.min(1.3, Math.max(0.75, Number(saved.pitch) || 1.02)),
        volume: Math.min(1, Math.max(0.2, Number(saved.volume) || 1)),
      });
    } catch { /* Voice preferences must not prevent using the chat. */ }
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() || []);
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    const stopWhenHidden = () => instance.setVisible(!document.hidden);
    const pageHide = () => instance.setVisible(false);
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("pageshow", stopWhenHidden);
    setReady(true);
    return () => {
      instance.dispose();
      controller.current = null;
      window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("pageshow", stopWhenHidden);
    };
  }, []);
  useEffect(() => {
    controller.current?.configure(config, voices);
    if (ready) { try { localStorage.setItem("bymax_configuracion_voz", JSON.stringify(config)); } catch {} }
  }, [config, voices, ready]);
  useEffect(() => {
    if (!ready || !options.available || initialized.current) return;
    initialized.current = true;
    const version = interaction.current;
    const instance = controller.current;
    (async () => {
      let preference, previouslyAllowed = false;
      try {
        preference = localStorage.getItem("bymax_voice_session");
        previouslyAllowed = preference === "active" || localStorage.getItem("bymax_escucha_activa") === "true";
      } catch {}
      if (preference === "ended" || preference === "off") { instance.restoreStopped(preference === "ended"); return; }
      try {
        const permission = await navigator.permissions?.query({ name: "microphone" });
        if (permission?.state === "denied") {
          if (controller.current === instance && interaction.current === version) instance.permissionDenied();
          return;
        }
        previouslyAllowed ||= permission?.state === "granted";
      } catch { /* Safari may not expose the microphone permission descriptor. */ }
      if (controller.current !== instance || interaction.current !== version) return;
      if (previouslyAllowed) instance.startListening("wake");
    })();
  }, [ready, options.available]);
  const startListening = useCallback(mode => { interaction.current += 1; save("bymax_voice_session", "active"); controller.current?.startListening(mode); }, []);
  const stopListening = useCallback(() => { interaction.current += 1; save("bymax_voice_session", "off"); controller.current?.stopListening(); }, []);
  const endConversation = useCallback(() => { interaction.current += 1; controller.current?.endConversation(); }, []);
  const beginTurn = useCallback(() => controller.current?.beginTurn(), []);
  const completeTurn = useCallback(() => controller.current?.completeTurn(), []);
  const stopPlayback = useCallback(() => controller.current?.stopPlayback(), []);
  const play = useCallback((text, id) => controller.current?.play(text, id), []);
  const enqueue = useCallback((text, id) => controller.current?.enqueue(text, id), []);
  const setEnabled = useCallback(value => { save("bymax_voice_responses", String(value)); controller.current?.setEnabled(value); }, []);
  const clearError = useCallback(() => controller.current?.clearError(), []);
  const updateConfig = useCallback(next => { controller.current?.stopPlayback(); setConfig(previous => ({ ...previous, ...next })); }, []);
  return { ...state, config, voices, startListening, stopListening, endConversation, beginTurn, completeTurn, stopPlayback, play, enqueue, setEnabled, clearError, updateConfig };
}
