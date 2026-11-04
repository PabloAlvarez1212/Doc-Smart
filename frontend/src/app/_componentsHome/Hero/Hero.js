"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowRight, BellRing, HeartPulse, LockKeyhole, Mic, ScanFace, Stethoscope } from 'lucide-react';
import Reveal from '../Reveal';
import home from '../home.module.css';
import styles from './Hero.module.css';

// Funciones reales del sistema alrededor de Bymax; la profundidad define cuánto siguen al cursor.
const destacados = [
  { icon: ScanFace, tono: styles.green, small: 'Al crear tu cuenta', title: 'Validación facial', depth: 16, className: styles.f1 },
  { icon: LockKeyhole, small: 'Tus datos protegidos', title: 'Información encriptada', depth: -14, className: styles.f2 },
  { icon: BellRing, small: 'Para tus citas', title: 'Recordatorios disponibles', depth: 10, className: styles.f3 },
];

export default function Hero() {
  // Mueve las tarjetas con el cursor sin volver a renderizar.
  const seguirCursor = (event) => {
    if (event.pointerType !== 'mouse') return;
    const art = event.currentTarget;
    const box = art.getBoundingClientRect();
    art.style.setProperty('--px', ((event.clientX - box.left) / box.width - .5).toFixed(3));
    art.style.setProperty('--py', ((event.clientY - box.top) / box.height - .5).toFixed(3));
  };

  const soltarCursor = (event) => {
    event.currentTarget.style.setProperty('--px', '0');
    event.currentTarget.style.setProperty('--py', '0');
  };

  return (
    <section className={`${home.section} ${styles.hero}`} aria-labelledby="hero-title">
      <Reveal>
        <span className={styles.pill}>
          <Mic size={15} strokeWidth={2} aria-hidden="true" />
          Habla con Bymax por chat o por voz
        </span>

        <h1 id="hero-title" className={styles.title}>
          Tu salud,<br />más <span>inteligente.</span>
        </h1>

        <p className={styles.lead}>
          Menos vueltas. Más claridad. Tus citas, conversaciones e información médica, en un mismo lugar.
        </p>

        <div className={styles.actions}>
          <Link href="/rol" className={home.primary}>
            Crear cuenta <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="#como-funciona" className={home.soft}>
            Ver cómo funciona <ArrowDown size={18} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.audience}>
          <span><HeartPulse size={16} aria-hidden="true" />Para pacientes</span>
          <span><Stethoscope size={16} aria-hidden="true" />Para profesionales de la salud</span>
        </div>
      </Reveal>

      <div className={styles.art} onPointerMove={seguirCursor} onPointerLeave={soltarCursor}>
        <div className={styles.orb}>
          <Image src="/images/logoSentado.png" width={240} height={240} alt="Bymax, el asistente de DocSmart" priority />
        </div>

        <ul className={styles.floats} aria-label="Funciones de DocSmart">
          {destacados.map(({ icon: Icon, tono, small, title, depth, className }) => (
            <li key={title} className={`${styles.float} ${className}`} style={{ '--d': depth }}>
              <span className={`${styles.icon} ${tono ?? ''}`}>
                <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span>
                <small>{small}</small>
                <b>{title}</b>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
