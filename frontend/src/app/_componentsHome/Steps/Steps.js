"use client";

import { motion } from 'motion/react';
import { CalendarCheck, Search, UserPlus } from 'lucide-react';
import Reveal from '../Reveal';
import home from '../home.module.css';
import styles from './Steps.module.css';

const pasos = [
  [UserPlus, 'Crea tu cuenta', 'Registra tus datos y verifica tu documento, tu correo y tu rostro.'],
  [Search, 'Encuentra a tu médico', 'Busca por especialidad o ciudad y revisa sus horarios disponibles.'],
  [CalendarCheck, 'Agenda y conversa', 'Envía la solicitud, sigue su estado en Mis citas y habla por chat.'],
];

export default function Steps() {
  return (
    <section id="como-funciona" className={home.section} aria-labelledby="steps-title">
      <Reveal className={home.head}>
        <h2 id="steps-title" className={home.h2}>Empieza en tres pasos.</h2>
        <p className={home.lead}>El mismo camino para pacientes y médicos; los médicos pasan además por una revisión del equipo.</p>
      </Reveal>

      <Reveal as="ol" className={styles.steps}>
        {/* La línea se dibuja de un paso al siguiente al entrar en pantalla. */}
        <span className={styles.line} aria-hidden="true">
          <motion.i
            initial={{ scaleX: 0, scaleY: 0 }}
            whileInView={{ scaleX: 1, scaleY: 1 }}
            viewport={{ once: true, amount: .6 }}
            transition={{ duration: 1.3, ease: [.23, 1, .32, 1], delay: .2 }}
          />
        </span>

        {pasos.map(([Icon, title, text], i) => (
          <li key={title} className={styles.step}>
            <span className={styles.number}>
              <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
              <span className={styles.badge}>{i + 1}</span>
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
