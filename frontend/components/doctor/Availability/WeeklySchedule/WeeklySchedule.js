"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as m, useReducedMotion } from 'motion/react';
import { Clock3, Plus, Trash2, Save, LoaderCircle, CheckCircle2, Banknote, ArrowRight, CalendarCheck2 } from 'lucide-react';
import Modal from '../../../ui/Modal/Modal';
import { scheduleErrors, errorText } from '../availabilityFeedback.mjs';
import styles from './WeeklySchedule.module.css';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MAX_VALOR = 5000000;

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

const aMinutos = (hora) => {
  const [h, min] = (hora || '0:0').split(':').map(Number);
  return h * 60 + min;
};

const resumenDia = (dia) => dia.activo && dia.bloques.length
  ? dia.bloques.map(b => `${b.hora_inicio} – ${b.hora_fin}`).join(', ')
  : 'Sin atención';

const formatoPesos = (valor) => valor === '' || valor == null ? '' : new Intl.NumberFormat('es-CO').format(Number(valor));

export default function WeeklySchedule({
  disponibilidad,
  duracionConsulta,
  valorConsulta,
  saving,
  onSave
}) {
  const reduced = useReducedMotion();
  const [semana, setSemana] = useState(() => createWeek(disponibilidad));
  const [duracion, setDuracion] = useState(duracionConsulta);
  const [valor, setValor] = useState(() => valorConsulta == null ? '' : String(valorConsulta));
  const [mensaje, setMensaje] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    setSemana(createWeek(disponibilidad));
  }, [disponibilidad]);
  useEffect(() => {
    setDuracion(duracionConsulta);
  }, [duracionConsulta]);
  useEffect(() => {
    setValor(valorConsulta == null ? '' : String(valorConsulta));
  }, [valorConsulta]);

  const valorGuardado = valorConsulta == null ? '' : String(valorConsulta);
  const dirty = JSON.stringify(semana) !== JSON.stringify(createWeek(disponibilidad)) || Number(duracion) !== Number(duracionConsulta) || valor !== valorGuardado;
  const errors = semana.map(d => d.activo ? scheduleErrors(d.bloques) : []);
  const errorValor = valor !== '' && Number(valor) > MAX_VALOR ? 'El valor no puede superar $5.000.000.' : '';

  // Lo que cambia respecto a lo guardado: se muestra antes de confirmar para que nada se guarde por accidente.
  const cambios = useMemo(() => {
    const lista = [];
    const guardada = createWeek(disponibilidad);
    if (Number(duracion) !== Number(duracionConsulta)) lista.push(['Duración de consulta', `${duracionConsulta} min`, `${duracion} min`]);
    if (valor !== valorGuardado) lista.push(['Valor por consulta', valorGuardado ? `$ ${formatoPesos(valorGuardado)}` : 'Sin definir', valor ? `$ ${formatoPesos(valor)}` : 'Sin definir']);
    semana.forEach((dia, i) => {
      const antes = resumenDia(guardada[i]);
      const despues = resumenDia(dia);
      if (antes !== despues) lista.push([dia.nombre, antes, despues]);
    });
    return lista;
  }, [semana, duracion, valor, disponibilidad, duracionConsulta, valorGuardado]);

  function pedirConfirmacion() {
    if (pending.current || saving) return;
    setSubmitted(true);
    setMensaje(null);
    if (errorValor || errors.some(day => day.some(Boolean))) {
      setMensaje({
        tipo: 'error',
        texto: errorValor || 'Revisa los horarios señalados antes de guardar.'
      });
      return;
    }
    setConfirmando(true);
  }

  async function confirmar() {
    await save();
    setConfirmando(false);
  }

  const reset = () => {
    setSemana(createWeek(disponibilidad));
    setDuracion(duracionConsulta);
    setValor(valorGuardado);
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
    if (errorValor || errors.some(day => day.some(Boolean))) {
      setMensaje({
        tipo: 'error',
        texto: errorValor || 'Revisa los horarios señalados antes de guardar.'
      });
      return;
    }
    pending.current = true;
    try {
      const result = await onSave({
        duracion_consulta: Number(duracion),
        valor_consulta: valor === '' ? null : Number(valor),
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

  const bloqueEntrada = reduced ? {} : {
    initial: { opacity: 0, height: 0, scale: .96, y: -6 },
    animate: { opacity: 1, height: 'auto', scale: 1, y: 0 },
    exit: { opacity: 0, height: 0, scale: .94, x: 56, transition: { duration: .28, ease: [.4, 0, 1, 1] } },
    transition: { type: 'spring', stiffness: 420, damping: 32, mass: .8 }
  };

  return <section className={styles.section} aria-labelledby="weekly-title">
    <div className={styles.sectionHeader}>
      <div><h2 id="weekly-title">Horario semanal</h2><p>Define tus días de atención, la duración y el valor de cada consulta.</p></div>
    </div>

    <div className={styles.settings}>
      <label className={styles.setting}>
        <span className={styles.settingIcon} aria-hidden="true"><Clock3 size={20} /></span>
        <span className={styles.settingBody}>
          <span className={styles.settingLabel}>Duración de consulta</span>
          <select value={duracion} disabled={saving} onChange={e => { setDuracion(Number(e.target.value)); setMensaje(null); }}>
            {[15, 20, 30, 45, 60, 90, 120].map(n => <option key={n} value={n}>{n} minutos</option>)}
          </select>
        </span>
      </label>

      <label className={styles.setting}>
        <span className={styles.settingIcon} aria-hidden="true"><Banknote size={20} /></span>
        <span className={styles.settingBody}>
          <span className={styles.settingLabel}>Valor por consulta</span>
          <span className={styles.money}>
            <span aria-hidden="true">$</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Sin definir"
              disabled={saving}
              value={formatoPesos(valor)}
              aria-invalid={Boolean(errorValor)}
              aria-describedby="valor-ayuda"
              onChange={e => {
                const limpio = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 8);
                setValor(limpio);
                setMensaje(null);
              }}
            />
            <small aria-hidden="true">COP</small>
          </span>
          <span id="valor-ayuda" className={errorValor ? styles.helpError : styles.help}>{errorValor || 'Los pacientes lo ven en tu tarjeta al buscar médico.'}</span>
        </span>
      </label>
    </div>

    <div className={styles.days}>{semana.map(dia => <article key={dia.id} className={`${styles.dayCard} ${dia.activo ? styles.dayOn : ''}`}>
      <div className={styles.dayHeader}><span className={styles.dayBadge} aria-hidden="true">{dia.nombre.slice(0, 3)}</span><div className={styles.dayTitle}><h3>{dia.nombre}</h3><span className={dia.activo ? styles.statusActive : styles.statusInactive}>{dia.activo ? `${dia.bloques.length} ${dia.bloques.length === 1 ? 'bloque de atención' : 'bloques de atención'}` : 'Sin atención'}</span></div><button type="button" disabled={saving} className={`${styles.switch} ${dia.activo ? styles.switchActive : ''}`} aria-label={`Atención el ${dia.nombre}`} aria-pressed={dia.activo} onClick={() => update(dia.id, d => ({
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
        <div className={styles.blocks}><AnimatePresence initial={false}>{dia.bloques.map((b, index) => {
          const error = submitted && errors[dia.id][index];
          const errorId = `hours-${dia.id}-${index}-error`;
          return <m.div key={index} className={styles.block} {...bloqueEntrada}><div className={styles.timeRow}>{['hora_inicio', 'hora_fin'].map((field, i) => <label key={field} className={styles.timeField}><span>{i ? 'Hasta' : 'Desde'}</span><input type="time" aria-label={`${dia.nombre}, bloque ${index + 1}, ${i ? 'hasta' : 'desde'}`} value={b[field]} disabled={saving} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={e => update(dia.id, d => ({
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
          })}><Trash2 size={17} /></button></div>{error && <p id={errorId} className={styles.messageError}>{error}</p>}</m.div>;
        })}</AnimatePresence></div>
        <button type="button" disabled={saving} className={styles.addButton} onClick={() => update(dia.id, d => {
          const ultimo = d.bloques[d.bloques.length - 1];
          return {
            ...d,
            bloques: [...d.bloques, ultimo && aMinutos(ultimo.hora_fin) < 17 * 60 ? {
              hora_inicio: ultimo.hora_fin,
              hora_fin: '18:00',
              activo: true
            } : {
              hora_inicio: '14:00',
              hora_fin: '18:00',
              activo: true
            }]
          };
        })}><Plus size={16} />Añadir horario<span className={styles.srOnly}> de {dia.nombre}</span></button>
      </m.div>}</AnimatePresence>
    </article>)}</div>

    <div className={styles.footer}><div role="status" aria-live="polite">{mensaje ? <p className={mensaje.tipo === 'success' ? styles.success : styles.messageError}>{mensaje.tipo === 'success' && <CheckCircle2 size={17} />} {mensaje.texto}</p> : <p className={styles.pending}>{dirty ? 'Tienes cambios sin guardar.' : 'Tu horario está actualizado.'}</p>}</div><div className={styles.footerActions}><button type="button" className={styles.cancelButton} disabled={!dirty || saving} onClick={reset}>Cancelar cambios</button><button type="button" className={styles.saveButton} disabled={saving || !dirty} onClick={pedirConfirmacion}>{saving ? <LoaderCircle className={styles.spinner} size={18} /> : <Save size={18} />} {saving ? 'Guardando…' : 'Guardar cambios'}</button></div></div>
    <Modal
      abierto={confirmando}
      onCerrar={() => { if (!saving) setConfirmando(false); }}
      titulo="¿Guardar tu disponibilidad?"
      text="Revisa lo que cambia. Los pacientes verán tus horarios nuevos de inmediato."
      width="560px"
      icon={<CalendarCheck2 size={22} aria-hidden="true" />}
      footer={<>
        <button type="button" className={styles.modalCancel} disabled={saving} onClick={() => setConfirmando(false)}>Seguir editando</button>
        <button type="button" className={styles.modalSave} disabled={saving} onClick={confirmar}>
          {saving ? <LoaderCircle className={styles.spinner} size={18} /> : <Save size={18} />} {saving ? 'Guardando…' : 'Confirmar y guardar'}
        </button>
      </>}
    >
      <ul className={styles.changeList}>
        {cambios.map(([campo, antes, despues]) => <li key={campo}>
          <strong>{campo}</strong>
          <span className={styles.before}>{antes}</span>
          <ArrowRight size={15} aria-hidden="true" />
          <span className={styles.after}>{despues}</span>
        </li>)}
      </ul>
      {cambios.length === 0 && <p className={styles.pending}>No hay cambios por guardar.</p>}
    </Modal>
  </section>;
}
