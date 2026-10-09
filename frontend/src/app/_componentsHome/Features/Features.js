"use client";

import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, MessageCircle, FileText, Stethoscope, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './Features.module.css';
const features = [[CalendarDays, 'Una agenda que se entiende.', 'Consulta horarios y gestiona tus citas, desde la solicitud hasta su seguimiento.'], [MessageCircle, 'La conversación continúa.', 'Accede al chat asociado a tus citas para conversar con tu médico o paciente.'], [FileText, 'Tu información, organizada.', 'Consulta el historial clínico y los documentos médicos asociados a tu cuenta.'], [Stethoscope, 'Más espacio para atender.', 'Los profesionales pueden gestionar su disponibilidad, consultas y pacientes.']];
export default function Features() {
  const reduce = useReducedMotion();
  return <section id="funcionalidades" className={styles.section} aria-labelledby="features-title"><div className={styles.heading}><h2 id="features-title">Todo conectado.<br /><span>Todo más sencillo.</span></h2><p>Herramientas que acompañan cada paso de tu atención, para pacientes y profesionales de la salud.</p></div><div className={styles.composition}><motion.article className={styles.bymax} initial={false} whileInView={{
        y: 0
      }} style={{
        y: 16
      }} viewport={{
        once: true,
        amount: .2
      }} transition={{
        duration: .45,
        ease: [.22, 1, .36, 1]
      }}><Image src="/icons/cara_bymax.png" width={100} height={100} alt="Bymax, asistente de DocSmart" /><div><h3>Una nueva forma<br />de hacer preguntas.</h3><p>Conversa con Bymax, el asistente de inteligencia artificial de DocSmart. Puedes consultar dudas y explorar las herramientas de la plataforma.</p><p className={styles.caution}>Sus respuestas no sustituyen una consulta médica.</p><Link href="/login">Conocer a Bymax <ArrowUpRight size={18} /></Link></div></motion.article><div className={styles.list}>{features.map(([Icon, title, description], i) => <motion.article key={title} className={styles.feature} initial={false} whileInView={{
          y: 0
        }} style={{
          y: 10
        }} viewport={{
          once: true,
          amount: .3
        }} transition={{
          duration: .3,
          delay: reduce ? 0 : i * .035
        }}><Icon size={25} strokeWidth={1.7} aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></motion.article>)}</div></div></section>;
}
