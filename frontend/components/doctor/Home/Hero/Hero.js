import ProfilePhoto from '../../../ui/ProfilePhoto/ProfilePhoto';
import { CalendarDays } from 'lucide-react';
import styles from '../Home.module.css';

export default function Hero({ nombre, especialidad, foto_perfil, date }) {
  return (
    <header className={styles.hero}>
      <div className={styles.identity}>
        <ProfilePhoto className={styles.avatar} src={foto_perfil || '/images/foto_default.png'} alt="Tu foto de perfil" width={56} height={56} priority />
        <div>
          <h1>Bienvenido{nombre ? `, ${nombre}` : ''}</h1>
          <p>Tu jornada de un vistazo.{especialidad && <span className={styles.specialty}> {especialidad}</span>}</p>
        </div>
      </div>
      <p className={styles.date}><CalendarDays size={17} aria-hidden="true" />{date || 'Tu agenda médica'}</p>
    </header>
  );
}
