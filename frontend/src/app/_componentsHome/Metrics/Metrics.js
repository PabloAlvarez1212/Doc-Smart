"use client";

import { useEffect, useState } from 'react';
import { Users, Stethoscope, CalendarDays, RefreshCw } from 'lucide-react';
import { publicRequest } from '../../services/publicServices';
import styles from './Metrics.module.css';
const fields = [['pacientes_registrados', 'Pacientes registrados', Users], ['medicos_aprobados', 'Médicos aprobados', Stethoscope], ['citas_registradas', 'Citas registradas', CalendarDays]];
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
  return <section className={styles.section} id="comunidad" aria-labelledby="metrics-title"><div className={styles.heading}><h2 id="metrics-title">DocSmart en cifras.</h2><p>Registros reales de la plataforma. Médicos aprobados no implica disponibilidad de citas.</p></div>{state === 'error' ? <div role="status" className={styles.error}><p>No pudimos cargar las estadísticas.</p><button type="button" onClick={() => setVersion(v => v + 1)}><RefreshCw size={16} />Volver a intentar</button></div> : <><div className={styles.grid} aria-busy={state === 'loading'}>{fields.map(([key, label, Icon]) => <div key={key} className={styles.metric}><Icon size={24} aria-hidden="true" /><strong>{state === 'loading' ? '—' : new Intl.NumberFormat('es-CO').format(data[key])}</strong><span>{label}</span></div>)}</div><p className={styles.note} role="status">{state === 'loading' ? 'Cargando estadísticas…' : fields.every(([key]) => data[key] === 0) ? 'Todavía no hay registros en la plataforma.' : `Consultadas el ${new Intl.DateTimeFormat('es-CO', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/Bogota'
        }).format(new Date(data.actualizado_en))} (Colombia).`}</p></>}</section>;
}
