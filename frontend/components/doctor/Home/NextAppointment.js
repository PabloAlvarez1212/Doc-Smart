"use client";

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarDays, Clock3, Mail, Phone } from 'lucide-react';
import ProfilePhoto from '../../ui/ProfilePhoto/ProfilePhoto';
import formatearFecha from '@/app/utils/fechaFormaterUtils';
import { getContentTransition, getPageReveal } from '../../patient/Home/patientHomeMotion';
import card from '../../patient/Home/AppointmentsList/AppointmentsList.module.css';
import styles from './NextAppointment.module.css';

export default function NextAppointment({ appointment }) {
  const reduced = useReducedMotion();
  const formatted = appointment ? formatearFecha(appointment.fecha_programada) : null;
  const status = String(appointment?.estado || '').toLowerCase();
  return (
    <motion.section className={`${card.section} ${styles.doctor}`} aria-labelledby="next-title" {...getPageReveal(reduced)}>
      <div className={card.heading}>
        <div><h2 id="next-title">Tu próxima consulta</h2><p>La próxima atención programada en tu agenda.</p></div>
        <Link href="/doctor/my-appointments">Ver agenda <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <AnimatePresence initial={false} mode="wait">
        <motion.div key={appointment?.id ?? 'empty'} {...getContentTransition(reduced)}>
          {appointment ? (
            <article className={card.appointment}>
              <div className={card.schedule}>
                <span className={card.calendarIcon} aria-hidden="true"><CalendarDays size={22} /></span>
                <div><span>Fecha y hora</span><strong>{formatted.fecha}</strong><small><Clock3 size={15} aria-hidden="true" />{formatted.hora}</small></div>
              </div>
              <div className={card.details}>
                <div className={card.doctor}>
                  <ProfilePhoto src={appointment.foto_paciente} alt={`Foto de ${appointment.paciente}`} width={64} height={64} />
                  <div><span>Atención a</span><h3>{appointment.paciente}</h3><p>Paciente</p></div>
                </div>
                <div className={styles.contact}>
                  <p>Contacto del paciente</p>
                  {appointment.correo && <div><Mail size={16} aria-hidden="true" /><span>{appointment.correo}</span></div>}
                  {appointment.telefono && <div><Phone size={16} aria-hidden="true" /><span>{appointment.telefono}</span></div>}
                  {!appointment.correo && !appointment.telefono && <span>Contacto no disponible</span>}
                </div>
              </div>
              <div className={`${card.footer} ${styles.footer}`}>
                <span className={`${card.status} ${card[status] || ''}`}>{appointment.estado || 'Sin estado'}</span>
                <p>Consulta los detalles o gestiona esta cita desde tu agenda.</p>
                <Link data-patient-detail-motion href="/doctor/my-appointments">Ver detalles <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </article>
          ) : (
            <div className={card.empty}>
              <span aria-hidden="true"><CalendarDays size={26} /></span>
              <div><h3>Sin próximas consultas</h3><p>Las próximas citas programadas aparecerán aquí.</p></div>
              <Link href="/doctor/availability">Revisar disponibilidad <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
