"use client";
import { useEffect, useState } from "react";
import { bymaxService } from "@/app/services/bymaxServices";

export default function useBymaxDiagnostics() {
  const [allowed, setAllowed] = useState(false);
  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    bymaxService.identidad().then(data => { if (!cancelled) setAllowed(data.diagnostico_autorizado === true); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!session?.expira_en) return;
    const timeout = setTimeout(() => setSession(null), Math.max(0, new Date(session.expira_en).getTime() - Date.now()));
    return () => clearTimeout(timeout);
  }, [session?.expira_en]);
  async function run(action, command = "") {
    if (busy || !allowed) return;
    setBusy(true); setError("");
    try {
      if (action !== "consultar") await bymaxService.diagnosticoAccion(action, command);
      setSession(action === "cerrar" ? null : await bymaxService.diagnosticoEstado());
    } catch {
      setSession(null); setError("Modo no disponible. Comprueba autorización, sesión y configuración con el administrador.");
    } finally { setBusy(false); }
  }
  return { allowed, session, busy, error, run };
}
