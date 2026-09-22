"use client";
import { useEffect, useRef, useState } from "react";
import { bymaxService } from "@/app/services/bymaxServices";

export default function useBymaxIdentity(open) {
  const [identity, setIdentity] = useState(null);
  const [mood, setMood] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(null);
  useEffect(() => {
    let cancelled = false;
    bymaxService.identidad().then(value => { if (!cancelled) setIdentity(value); })
      .catch(() => { if (!cancelled) setError("No fue posible cargar tu identidad de Bymax."); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Reuse the in-flight request during React's effect replay. The database,
    // not this ref, is responsible for once-per-day behavior across browsers.
    if (!pending.current) pending.current = bymaxService.preguntarAnimo();
    const request = pending.current;
    request.then(value => {
      if (!cancelled) setMood(previous => previous?.fecha === value.fecha && previous.preguntar && value.puntuacion == null ? previous : value);
    }).catch(() => { if (!cancelled) setError("No fue posible consultar el ánimo diario."); })
      .finally(() => { if (!cancelled && pending.current === request) pending.current = null; });
    return () => { cancelled = true; };
  }, [open]);
  async function save(score) {
    if (saving) return;
    setSaving(true); setError("");
    try { setMood(await bymaxService.guardarAnimo(score)); }
    catch { setError("No fue posible guardar tu respuesta. Puedes intentarlo nuevamente."); }
    finally { setSaving(false); }
  }
  return { identity, mood, error, saving, save };
}
