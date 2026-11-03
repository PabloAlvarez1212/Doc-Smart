import ProfilePhoto from '../../../ui/ProfilePhoto/ProfilePhoto';
import { Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import RollingNumber from '../../../ui/Motion/RollingNumber';
import styles from '../Home.module.css';

export default function Hero({ nombre, especialidad, foto_perfil, noLeidas = 0 }) {
  const unread = Number.isFinite(Number(noLeidas)) ? Math.max(0, Number(noLeidas)) : 0;
  return (
    <header className={styles.hero}>
      <div className={styles.identity}>
        <ProfilePhoto className={styles.avatar} src={foto_perfil || '/images/foto_default.png'} alt="Tu foto de perfil" width={56} height={56} priority />
        <div>
          <h1>Bienvenido{nombre ? `, ${nombre}` : ''}</h1>
          <p>Tu jornada de un vistazo.{especialidad && <span className={styles.specialty}> {especialidad}</span>}</p>
        </div>
      </div>
      <div className={styles.heroActions}>
        <Link href="/doctor/notifications" className={`${styles.notificationLink} ${unread > 0 ? styles.hasUnread : ''}`}>
          <span aria-hidden="true"><Bell size={19} /></span>
          <span><RollingNumber className={styles.unreadCount} value={unread} /><small>{unread === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}</small></span>
          <ChevronRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
