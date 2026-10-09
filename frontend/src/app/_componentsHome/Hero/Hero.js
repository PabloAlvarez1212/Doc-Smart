"use client";

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarDays, MessageCircle, FileText, ChevronRight } from 'lucide-react';
import styles from './Hero.module.css';
export default function Hero() {
  const reduce = useReducedMotion();
  return <section className={styles.hero} aria-labelledby="hero-title"><div className={styles.copy}><h1 id="hero-title">Tu salud,<br />más <span>inteligente.</span></h1><p>Menos vueltas. Más claridad.<br />Tus citas, conversaciones e información médica, en un mismo lugar.</p><div className={styles.actions}><Link href="/rol" className={styles.primary}>Comenzar ahora <ArrowRight size={18} /></Link><Link href="#funcionalidades" className={styles.secondary}>Descubre DocSmart <ChevronRight size={18} /></Link></div><div className={styles.audience}><span>Para pacientes.</span><span>Para profesionales.</span></div></div><motion.div className={styles.preview} initial={false} whileInView={{
      y: 0
    }} style={{
      y: 12
    }} viewport={{
      once: true
    }} transition={{
      type: 'spring',
      bounce: 0,
      duration: .6
    }}><div className={styles.previewHeader}><div><Image src="/images/logoSentado.png" alt="" width={44} height={44} /><strong>Un espacio para tu salud</strong></div><span>Demostración</span></div><p className={styles.demoNote}>Vista ilustrativa. No contiene citas, mensajes ni registros de una cuenta real.</p><div className={styles.appointment}><div className={styles.calendar}><CalendarDays size={27} /></div><div><span className={styles.caption}>Tu próxima consulta</span><h2>Todo empieza con una cita.</h2><p>Encuentra un médico y consulta sus horarios.</p></div><ChevronRight size={20} aria-hidden="true" /></div><div className={styles.tools}><div><MessageCircle size={23} /><h3>Conversaciones</h3><p>El chat de tus citas, a mano.</p></div><div><FileText size={23} /><h3>Historial clínico</h3><p>Consulta tu información médica.</p></div></div><div className={styles.assistant}><Image src="/icons/cara_bymax.png" width={40} height={40} alt="" /><div><strong>Conoce a Bymax</strong><p>El asistente de DocSmart.</p></div><span>IA</span></div></motion.div></section>;
}
