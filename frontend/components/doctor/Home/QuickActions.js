import Link from 'next/link';
import { CalendarDays, CalendarClock, UserRound, ArrowUpRight } from 'lucide-react';
import styles from './Home.module.css';

const actions = [
  ['/doctor/my-appointments', 'Mis citas', 'Consulta y gestiona tus consultas', CalendarDays],
  ['/doctor/availability', 'Disponibilidad', 'Organiza tus horarios de atención', CalendarClock],
  ['/doctor/my-profile', 'Mi perfil', 'Mantén tu información actualizada', UserRound],
];

export default function QuickActions() {
  return (
    <section className={styles.quick} aria-labelledby="quick-title">
      <h2 id="quick-title">Tu espacio de trabajo</h2>
      <p>Lo que necesitas para continuar.</p>
      <nav aria-label="Accesos rápidos">
        {actions.map(([href, label, description, Icon]) => (
          <Link key={href} href={href}>
            <span className={styles.actionIcon}><Icon size={20} aria-hidden="true" /></span>
            <span><strong>{label}</strong><small>{description}</small></span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
