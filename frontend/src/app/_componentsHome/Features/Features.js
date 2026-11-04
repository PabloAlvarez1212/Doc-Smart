"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, ClipboardList, Mic, Pill, TriangleAlert } from 'lucide-react';
import Reveal from '../Reveal';
import home from '../home.module.css';
import styles from './Features.module.css';

const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const horas = ['8:00', '9:30', '11:00', '3:30'];
const disponibilidad = [['Lun', '10%', '30%'], ['Mar', '10%', '30%'], ['Mié', '10%', '55%'], ['Jue', '10%', '30%'], ['Vie', null, null]];
const salud = [[TriangleAlert, 'Alergias'], [Pill, 'Medicamentos'], [ClipboardList, 'Antecedentes']];

const burbuja = (delay) => ({
  initial: { opacity: 0, y: 8, scale: .98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: .4, ease: [.23, 1, .32, 1], delay },
});

// Conversación de muestra que se escribe cuando la tarjeta entra en pantalla.
function BymaxChat() {
  const [visible, setVisible] = useState(false);
  const [respondio, setRespondio] = useState(false);

  return (
    <motion.div
      className={styles.chat}
      aria-hidden="true"
      onViewportEnter={() => setVisible(true)}
      viewport={{ once: true, amount: .6 }}
    >
      {visible && (
        <>
          <motion.div className={`${styles.bubble} ${styles.me}`} {...burbuja(.15)}>¿Cómo agendo una cita?</motion.div>
          {!respondio && (
            <motion.div
              className={`${styles.bubble} ${styles.typing}`}
              {...burbuja(.6)}
              onAnimationComplete={() => setTimeout(() => setRespondio(true), 1100)}
            >
              <i /><i /><i />
            </motion.div>
          )}
          {respondio && (
            <motion.div className={`${styles.bubble} ${styles.bot}`} {...burbuja(0)}>
              Entra en Encontrar doctores, elige un horario disponible y envía la solicitud. Puedo ayudarte a buscar.
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}

export default function Features() {
  return (
    <section id="funcionalidades" className={home.section} aria-labelledby="features-title">
      <Reveal className={home.head}>
        <h2 id="features-title" className={home.h2}>Todo conectado.<br /><span className={home.mute}>Todo más sencillo.</span></h2>
        <p className={home.lead}>Herramientas que acompañan cada paso de tu atención, para pacientes y profesionales de la salud.</p>
      </Reveal>

      <div className={styles.bento}>
        <Reveal as="article" className={styles.bymax}>
          <span className={styles.face}>
            <Image src="/images/logoCara.png" width={46} height={46} alt="" />
          </span>
          <h3>Una nueva forma<br />de hacer preguntas.</h3>
          <p>Conversa con Bymax, el asistente de inteligencia artificial de DocSmart. Resuelve dudas y te guía por la plataforma.</p>
          <p className={styles.caution}>Sus respuestas no sustituyen una consulta médica.</p>

          <BymaxChat />

          <div className={styles.bymaxActions}>
            <span className={styles.voice}><Mic size={17} aria-hidden="true" />Por chat y por voz</span>
            <Link href="/login" className={styles.meet}>Conocer a Bymax <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
        </Reveal>

        <Reveal as="article" className={styles.cell} delay={.05}>
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.week}>
              {dias.map((dia, i) => <span key={dia} className={i === 3 ? styles.selected : ''}>{dia}</span>)}
            </div>
            <div className={styles.slots}>
              {horas.map((hora, i) => <span key={hora} className={i === 1 ? styles.selected : ''}>{hora}</span>)}
            </div>
          </div>
          <h3>Una agenda que se entiende.</h3>
          <p>Consulta horarios y sigue tu cita desde la solicitud hasta el seguimiento.</p>
        </Reveal>

        <Reveal as="article" className={styles.cell} delay={.1}>
          <div className={styles.visual} aria-hidden="true">
            <span className={`${styles.message} ${styles.left}`}>¿Cómo sigue la molestia?<small>Médico</small></span>
            <span className={`${styles.message} ${styles.right}`}>Mucho mejor, gracias.<small>Paciente</small></span>
          </div>
          <h3>La conversación continúa.</h3>
          <p>El chat de cada cita, con tu médico o tu paciente.</p>
        </Reveal>

        <Reveal as="article" className={styles.cell} delay={.05}>
          <div className={styles.visual} aria-hidden="true">
            {salud.map(([Icon, label]) => (
              <span key={label} className={styles.record}>
                <span><Icon size={15} /></span>{label}
              </span>
            ))}
          </div>
          <h3>Tu información, organizada.</h3>
          <p>Tu historial clínico y tu información de salud, a mano para tu médico.</p>
        </Reveal>

        <Reveal as="article" className={styles.cell} delay={.1}>
          <div className={styles.visual} aria-hidden="true">
            {disponibilidad.map(([dia, inicio, fin]) => (
              <span key={dia} className={styles.availability}>
                {dia}
                <span className={inicio ? '' : styles.off}>
                  {inicio && <i style={{ left: inicio, right: fin }} />}
                </span>
              </span>
            ))}
          </div>
          <h3>Más espacio para atender.</h3>
          <p>Los médicos gestionan su disponibilidad, consultas y pacientes.</p>
        </Reveal>
      </div>
    </section>
  );
}
