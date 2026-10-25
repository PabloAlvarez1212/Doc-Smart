"use client";

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion as m, useReducedMotion } from 'motion/react';
import { Plus, Trash2, LoaderCircle } from 'lucide-react';
import Modal from '../../../ui/Modal/Modal';
import { scheduleErrors, errorText } from '../availabilityFeedback.mjs';
import styles from './ExceptionModal.module.css';
const INITIAL = {
  fecha: '',
  tipo: 'NO_DISPONIBLE',
  motivo: '',
  horarios: []
};
export default function ExceptionModal({
  open,
  excepcion,
  saving = false,
  onClose,
  onGuardar
}) {
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const pending = useRef(false);
  const formRef = useRef(null);
  const reduced = useReducedMotion();
  const edit = Boolean(excepcion);
  useEffect(() => {
    // Disabling the submit button can move browser focus to the body during a request.
    // Return it to the failed field so keyboard navigation stays inside the dialog.
    if (open && error && !saving && !formRef.current?.contains(document.activeElement)) {
      (formRef.current?.querySelector('[aria-invalid="true"]') || formRef.current?.querySelector('button[type="submit"]'))?.focus();
    }
  }, [open, error, saving]);
  useEffect(() => {
    if (!open) return;
    setForm(excepcion ? {
      fecha: excepcion.fecha,
      tipo: excepcion.tipo,
      motivo: excepcion.motivo ?? '',
      horarios: excepcion.horarios?.map(b => ({
        hora_inicio: b.hora_inicio.slice(0, 5),
        hora_fin: b.hora_fin.slice(0, 5)
      })) ?? []
    } : INITIAL);
    setError('');
    setFieldErrors({});
    setSubmitted(false);
  }, [open, excepcion]);
  const change = (field, value) => {
    setError('');
    setFieldErrors({});
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const errors = scheduleErrors(form.horarios);
  async function submit(e) {
    e.preventDefault();
    if (pending.current || saving) return;
    setSubmitted(true);
    setError('');
    setFieldErrors({});
    if (form.tipo === 'HORARIO_ESPECIAL' && (!form.horarios.length || errors.some(Boolean))) {
      setError('Revisa los horarios antes de guardar.');
      return;
    }
    pending.current = true;
    try {
      const result = await onGuardar(form, edit);
      if (result && !result.ok) {
        const fields = result.errores || {};
        setFieldErrors(fields);
        setError(fields.fecha || fields.motivo || fields.horarios ? 'Revisa los campos señalados.' : errorText(result.mensaje) || 'No pudimos guardar. Revisa los datos e inténtalo de nuevo.');
      }
    } finally {
      pending.current = false;
    }
  }
  return <Modal abierto={open} headerVariant="white" onCerrar={() => {
    if (!saving && !pending.current) onClose();
  }} titulo={edit ? 'Editar excepción' : 'Nueva excepción'} text="Ajusta la atención para una fecha específica." width="620px">
  <form ref={formRef} className={styles.form} onSubmit={submit}>
   <fieldset className={styles.fields} disabled={saving}>
    <label className={styles.field}>Fecha<input aria-label="Fecha" aria-invalid={Boolean(fieldErrors.fecha)} aria-describedby={fieldErrors.fecha ? "exception-date-error" : undefined} type="date" value={form.fecha} disabled={saving || edit} required onChange={e => change('fecha', e.target.value)} />{fieldErrors.fecha && <span id="exception-date-error" role="alert" className={styles.error}>{errorText(fieldErrors.fecha)}</span>}</label>
    <div className={styles.field}><span>Tipo de excepción</span><div className={styles.typeOptions}>{[['NO_DISPONIBLE', 'No disponible'], ['HORARIO_ESPECIAL', 'Horario especial']].map(([type, label]) => <button key={type} type="button" className={form.tipo === type ? styles.typeActive : styles.typeButton} aria-pressed={form.tipo === type} onClick={() => {
              setError('');
              setFieldErrors({});
              setForm(prev => ({
                ...prev,
                tipo: type,
                horarios: type === 'HORARIO_ESPECIAL' ? prev.horarios.length ? prev.horarios : [{
                  hora_inicio: '08:00',
                  hora_fin: '12:00'
                }] : []
              }));
            }}>{label}</button>)}</div></div>
    <AnimatePresence initial={false}>{form.tipo === 'HORARIO_ESPECIAL' && <m.div key="schedules" initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: 'auto'
          }} exit={{
            opacity: 0,
            height: 0
          }} transition={{
            duration: reduced ? 0 : .2
          }} className={styles.scheduleList}>
     <div className={styles.scheduleHeader}><span>Bloques de atención</span><button type="button" className={styles.addSchedule} onClick={() => change('horarios', [...form.horarios, {
                hora_inicio: '14:00',
                hora_fin: '18:00'
              }])}><Plus size={16} />Agregar</button></div>
     {form.horarios.map((b, index) => <div key={index}><div className={styles.schedule}>{['hora_inicio', 'hora_fin'].map((field, i) => <label key={field}> {i ? 'Hasta' : 'Desde'}<input type="time" value={b[field]} required aria-label={`Excepción, bloque ${index + 1}, ${i ? 'hasta' : 'desde'}`} aria-invalid={Boolean(submitted && errors[index])} aria-describedby={submitted && errors[index] ? `exception-${index}-error` : undefined} onChange={e => change('horarios', form.horarios.map((row, j) => j === index ? {
                    ...row,
                    [field]: e.target.value
                  } : row))} /></label>)}<button type="button" className={styles.removeSchedule} aria-label={`Eliminar bloque ${index + 1}`} onClick={() => change('horarios', form.horarios.filter((_, j) => j !== index))}><Trash2 size={17} /></button></div>{submitted && errors[index] && <p className={styles.error} id={`exception-${index}-error`}>{errors[index]}</p>}</div>)}
    {fieldErrors.horarios && <p role="alert" className={styles.error}>{errorText(fieldErrors.horarios)}</p>}</m.div>}</AnimatePresence>
    <label className={styles.field}>Motivo (opcional)<textarea aria-label="Motivo (opcional)" aria-invalid={Boolean(fieldErrors.motivo)} aria-describedby={fieldErrors.motivo ? "exception-reason-error" : undefined} rows={3} maxLength={255} value={form.motivo} onChange={e => change('motivo', e.target.value)} placeholder="Por ejemplo: congreso o día personal" />{fieldErrors.motivo && <span id="exception-reason-error" role="alert" className={styles.error}>{errorText(fieldErrors.motivo)}</span>}</label>
   </fieldset>
   {error && <p role="alert" className={styles.error}>{error}</p>}
   <div className={styles.footer}><button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className={styles.saveButton} disabled={saving} aria-busy={saving}>{saving && <LoaderCircle size={17} className={styles.spinner} />} {saving ? 'Guardando…' : edit ? 'Guardar cambios' : 'Crear excepción'}</button></div>
  </form>
 </Modal>;
}
