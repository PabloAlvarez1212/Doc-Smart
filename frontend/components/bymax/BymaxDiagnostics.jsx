"use client";
import { useState } from "react";
import useBymaxDiagnostics from "./useBymaxDiagnostics";
import styles from "./BymaxAssistant.module.css";

export default function BymaxDiagnostics() {
  const diagnostic = useBymaxDiagnostics();
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  if (!diagnostic.allowed) return null;
  return <aside className={styles.diagnostics} aria-label="Diagnóstico autorizado de Bymax">
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>Diagnóstico Bymax</button>
    {open && <section>
      <h2>Diagnóstico autorizado</h2>
      <p>Las activaciones se auditan y vencen a los diez minutos. Solo se muestran errores sanitizados de tu cuenta.</p>
      {!diagnostic.session ? <>
        <label>Comando configurado, si se requiere<input type="password" autoComplete="off" value={command} onChange={event => setCommand(event.target.value)}/></label>
        <button type="button" disabled={diagnostic.busy} onClick={() => { diagnostic.run("activar", command); setCommand(""); }}>Confirmar activación</button>
        <button type="button" disabled={diagnostic.busy} onClick={() => diagnostic.run("consultar")}>Consultar sesión existente</button>
      </> : <>
        <p>Vence: {new Date(diagnostic.session.expira_en).toLocaleTimeString("es-CO")}</p>
        <button type="button" disabled={diagnostic.busy} onClick={() => diagnostic.run("consultar")}>Actualizar</button>
        <button type="button" disabled={diagnostic.busy} onClick={() => diagnostic.run("cerrar")}>Confirmar cierre del modo</button>
        {!diagnostic.session.errores.length && <p>No hay errores registrados para tu cuenta.</p>}
        {diagnostic.session.errores.map(error => <article key={error.correlation_id}>
          <strong>{error.codigo}</strong>
          <p>{error.tipo} · {error.componente} · {error.operacion}</p>
          <p>{new Date(error.fecha).toLocaleString("es-CO")} · Reintentable: {error.retryable ? "sí" : "no"}</p>
          <p>{error.explicacion}</p><p>{error.pasos}</p><small>Correlación: {error.correlation_id}</small>
        </article>)}
      </>}
      {diagnostic.error && <p role="alert">{diagnostic.error}</p>}
    </section>}
  </aside>;
}
