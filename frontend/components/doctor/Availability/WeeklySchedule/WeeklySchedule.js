"use client";

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as m, useReducedMotion } from 'motion/react';
import { Clock3, Plus, Trash2, Save, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { scheduleErrors, errorText } from '../availabilityFeedback.mjs';
import styles from './WeeklySchedule.module.css';
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
function createWeek(data) {
  return DAYS.map((nombre, id) => {
    const bloques = data.filter(b => b.dia_semana === id).map(b => ({
      hora_inicio: b.hora_inicio.slice(0, 5),
      hora_fin: b.hora_fin.slice(0, 5),
      activo: b.activo
    }));
    return {
      id,
      nombre,
      activo: bloques.length > 0,
      bloques
    };
  });
}
export default function WeeklySchedule({
  disponibilidad,
  duracionConsulta,
  saving,
  onSave
}) {
  const reduced = useReducedMotion();
  const [semana, setSemana] = useState(() => createWeek(disponibilidad));
  const [duracion, setDuracion] = useState(duracionConsulta);
  const [mensaje, setMensaje] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    setSemana(createWeek(disponibilidad));
  }, [disponibilidad]);
  useEffect(() => {
    setDuracion(duracionConsulta);
  }, [duracionConsulta]);
  const dirty = JSON.stringify(semana) !== JSON.stringify(createWeek(disponibilidad)) || Number(duracion) !== Number(duracionConsulta);
  const errors = semana.map(d => d.activo ? scheduleErrors(d.bloques) : []);
  const reset = () => {
    setSemana(createWeek(disponibilidad));
    setDuracion(duracionConsulta);
    setMensaje(null);
    setSubmitted(false);
  };
  const update = (id, change) => {
    setMensaje(null);
    setSemana(prev => prev.map(d => d.id === id ? change(d) : d));
  };
  async function save() {
    if (pending.current || saving) return;
    setSubmitted(true);
    setMensaje(null);
    if (errors.some(day => day.some(Boolean))) {
      setMensaje({
        tipo: 'error',
        texto: 'Revisa los horarios señalados antes de guardar.'
      });
      return;
    }
    pending.current = true;
    try {
      const result = await onSave({
        duracion_consulta: Number(duracion),
        disponibilidad: semana.flatMap(d => d.activo ? d.bloques.map(b => ({
          dia_semana: d.id,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
          activo: true
        })) : [])
      });
      setMensaje({
        tipo: result.ok ? 'success' : 'error',
        texto: errorText(result.mensaje)
      });
      if (result.ok) setSubmitted(false);
    } finally {
      pending.current = false;
    }
  }
  return <section className={styles.section} aria-labelledby="weekly-title">
  <div className={styles.sectionHeader}><div><h2 id="weekly-title">Horario semanal</h2><p>Define tus días de atención y añade los bloques que necesites.</p></div><label className={styles.duration}><Clock3 size={20} aria-hidden="true" /><span>Duración de consulta<select value={duracion} disabled={saving} onChange={e => {
            setDuracion(Number(e.target.value));
            setMensaje(null);
          }}>{[15, 30, 45, 60, 90, 120].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></span></label></div>
  <div className={styles.days}>{semana.map(dia => <article key={dia.id} className={`${styles.dayCard} ${dia.activo ? styles.dayActive : ''}`}>
   <div className={styles.dayHeader}><div><h3>{dia.nombre}</h3><span className={dia.activo ? styles.statusActive : styles.statusInactive}>{dia.activo ? `${dia.bloques.length} ${dia.bloques.length === 1 ? 'bloque de atención' : 'bloques de atención'}` : 'Sin atención'}</span></div><button type="button" disabled={saving} className={`${styles.switch} ${dia.activo ? styles.switchActive : ''}`} aria-label={`Atención el ${dia.nombre}`} aria-pressed={dia.activo} onClick={() => update(dia.id, d => ({
            ...d,
            activo: !d.activo,
            bloques: d.activo ? [] : [{
              hora_inicio: '08:00',
              hora_fin: '12:00',
              activo: true
            }]
          }))}><span /></button></div>
   <AnimatePresence initial={false}>{dia.activo && <m.div key="hours" className={styles.dayContent} initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: 'auto'
          }} exit={{
            opacity: 0,
            height: 0
          }} transition={{
            duration: reduced ? 0 : .2,
            ease: [.16, 1, .3, 1]
          }}>
    <div className={styles.blocks}>{dia.bloques.map((b, index) => {
                const error = submitted && errors[dia.id][index];
                const errorId = `hours-${dia.id}-${index}-error`;
                return <div key={index} className={styles.block}><div className={styles.timeRow}>{['hora_inicio', 'hora_fin'].map((field, i) => <label key={field} className={styles.timeField}><span>{i ? 'Hasta' : 'Desde'}</span><input type="time" aria-label={`${dia.nombre}, bloque ${index + 1}, ${i ? 'hasta' : 'desde'}`} value={b[field]} disabled={saving} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={e => update(dia.id, d => ({
                        ...d,
                        bloques: d.bloques.map((row, j) => j === index ? {
                          ...row,
                          [field]: e.target.value
                        } : row)
                      }))} /></label>)}<button type="button" className={styles.deleteButton} disabled={saving} aria-label={`Eliminar horario ${index + 1} de ${dia.nombre}`} onClick={() => update(dia.id, d => {
                      const bloques = d.bloques.filter((_, j) => j !== index);
                      return {
                        ...d,
                        bloques,
                        activo: bloques.length > 0
                      };
                    })}><Trash2 size={17} /></button></div>{error && <p id={errorId} className={styles.messageError}>{error}</p>}</div>;
              })}</div>
    <button type="button" disabled={saving} className={styles.addButton} onClick={() => update(dia.id, d => ({
              ...d,
              bloques: [...d.bloques, {
                hora_inicio: '14:00',
                hora_fin: '18:00',
                activo: true
              }]
            }))}><Plus size={16} />Añadir horario<span className={styles.srOnly}> de {dia.nombre}</span></button>
   </m.div>}</AnimatePresence>
  </article>)}</div>
  <div className={styles.footer}><div role="status" aria-live="polite">{mensaje ? <p className={mensaje.tipo === 'success' ? styles.success : styles.messageError}>{mensaje.tipo === 'success' && <CheckCircle2 size={17} />} {mensaje.texto}</p> : <p className={styles.pending}>{dirty ? 'Tienes cambios sin guardar.' : 'Tu horario está actualizado.'}</p>}</div><div className={styles.footerActions}><button type="button" className={styles.cancelButton} disabled={!dirty || saving} onClick={reset}>Cancelar cambios</button><button type="button" className={styles.saveButton} disabled={saving || !dirty} onClick={save}>{saving ? <LoaderCircle className={styles.spinner} size={18} /> : <Save size={18} />} {saving ? 'Guardando…' : 'Guardar cambios'}</button></div></div>
 </section>;
}
