"use client";

import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';
import { Users, Stethoscope, CalendarDays, RefreshCw } from 'lucide-react';
import { publicRequest } from '../../services/publicServices';
import Reveal from '../Reveal';
import home from '../home.module.css';
import styles from './Metrics.module.css';
const fields = [['pacientes_registrados', 'Pacientes registrados', Users], ['medicos_aprobados', 'Médicos aprobados', Stethoscope], ['citas_registradas', 'Citas registradas', CalendarDays]];
const formato = new Intl.NumberFormat('es-CO');

// Cuenta desde cero cuando la cifra entra en pantalla.
function Contador({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: .6 });
  useEffect(() => {
    const node = ref.current;
    if (!inView || !node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.textContent = formato.format(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.3,
      ease: [.23, 1, .32, 1],
      onUpdate: latest => {
        node.textContent = formato.format(Math.round(latest));
      }
    });
    return () => controls.stop();
  }, [inView, value]);
  return <strong ref={ref} aria-label={formato.format(value)}>0</strong>;
}

export default function Metrics() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    publicRequest('/public/metrics/', {
      signal: controller.signal,
      credentials: 'omit'
    }).then(response => {
      if (!Number.isFinite(Date.parse(response.data?.actualizado_en)) || !fields.every(([key]) => Number.isInteger(response.data?.[key]) && response.data[key] >= 0)) throw new Error('Datos inválidos');
      setData(response.data);
      setState('ready');
    }).catch(() => {
      if (!controller.signal.aborted) {
        setData(null);
        setState('error');
      }
    });
    return () => controller.abort();
  }, [version]);
  return <section className={home.section} id="comunidad" aria-labelledby="metrics-title">
      <Reveal className={home.head}>
        <h2 id="metrics-title" className={home.h2}>DocSmart en cifras.</h2>
        <p className={home.lead}>Registros reales de la plataforma. Médicos aprobados no implica disponibilidad de citas.</p>
      </Reveal>

      {state === 'error' ? <div role="status" className={styles.error}>
          <p>No pudimos cargar las estadísticas.</p>
          <button type="button" onClick={() => setVersion(v => v + 1)}><RefreshCw size={16} />Volver a intentar</button>
        </div> : <>
          <div className={styles.grid} aria-busy={state === 'loading'}>
            {fields.map(([key, label, Icon], i) => <Reveal key={key} className={styles.metric} delay={i * .06}>
                <span className={styles.icon}><Icon size={21} aria-hidden="true" /></span>
                {state === 'loading' ? <strong className={styles.loading}>—</strong> : <Contador value={data[key]} />}
                <span>{label}</span>
              </Reveal>)}
          </div>

          <p className={styles.note} role="status">
            {state === 'ready' && <span className={home.live} aria-hidden="true" />}
            {state === 'loading' ? 'Cargando estadísticas…' : fields.every(([key]) => data[key] === 0) ? 'Todavía no hay registros en la plataforma.' : `Consultadas el ${new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'America/Bogota'
          }).format(new Date(data.actualizado_en))} (Colombia).`}
          </p>
        </>}
    </section>;
}
