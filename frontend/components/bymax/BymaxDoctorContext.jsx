"use client";
import { useEffect, useState } from "react";
import { bymaxService } from "@/app/services/bymaxServices";
import styles from "./BymaxAssistant.module.css";

export default function BymaxDoctorContext({ chatId, sending, loading, onCommand }) {
  const [context, setContext] = useState(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [fetching, setFetching] = useState(false);
  useEffect(() => {
    if (!chatId || sending || loading) return;
    let cancelled = false;
    setFetching(true);
    setError("");
    bymaxService.obtenerContextoMedico(chatId).then(data => {
      if (!cancelled) setContext({ ...data, chatId });
    }).catch(e => { if (!cancelled) { setError(e.message); setContext(null); } })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [chatId, sending, loading, refresh]);
  const current = context?.chatId === chatId ? context : null;
  const disabled = sending || loading || fetching || !current;
  const active = current?.paciente_activo;
  const pacientes = new Map((current?.citas || []).map(cita => [cita.paciente.id, cita.paciente]));
  if (active) pacientes.set(active.id, active);
  return <section className={styles.doctorContext} aria-label="Contexto clínico">
    <div className={styles.contextHeading}><strong>Bymax Médico · Copiloto clínico</strong>
      <button type="button" disabled={sending || loading || fetching} onClick={() => setRefresh(value => value + 1)}>Actualizar citas</button>
    </div>
    <label htmlFor="bymax-active-patient">Paciente activo</label>
    <div className={styles.contextControls}>
      <select id="bymax-active-patient" value={active?.id || ""} disabled={disabled}
        onChange={event => event.target.value && onCommand(`Seleccionar paciente #${event.target.value}`)}>
        <option value="">Selecciona un paciente de tus citas</option>
        {[...pacientes.values()].map(paciente => <option key={paciente.id} value={paciente.id}>{paciente.nombre} · #{paciente.id}</option>)}
      </select>
      <button type="button" disabled={disabled || !active} onClick={() => onCommand("Cerrar contexto")}>Cerrar contexto</button>
    </div>
    <p role="status">{error || (fetching ? "Cargando contexto…" : active ? `Caso activo: ${active.nombre}. Solo tus historiales.` : "Sin paciente activo.")}</p>
    {current && !fetching && <details>
      <summary>Próximas citas ({current.citas.length})</summary>
      <ul className={styles.clinicalAppointments}>{current.citas.map(cita => <li key={cita.id_cita}>
        <span><strong>{cita.paciente.nombre}</strong><br/>{new Date(cita.fecha_programada).toLocaleString("es-CO")} · {cita.estado}</span>
        <button type="button" disabled={disabled} onClick={() => onCommand(`Seleccionar paciente #${cita.paciente.id}`)}>Seleccionar</button>
      </li>)}</ul>
      {!current.citas.length && <p>No tienes citas próximas en los estados permitidos.</p>}
    </details>}
    <small>Apoyo profesional. Los diagnósticos, tratamientos y borradores requieren tu valoración.</small>
  </section>;
}
