import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Reveal from '../Reveal';
import home from '../home.module.css';
import styles from './Footer.module.css';

const columnas = [
  ['Producto', [['/#funcionalidades', 'Funcionalidades'], ['/#como-funciona', 'Cómo funciona'], ['/#comunidad', 'DocSmart en cifras']]],
  ['DocSmart', [['/#quienes-somos', 'Quiénes somos'], ['/#ayuda', 'Ayuda']]],
  ['Cuenta', [['/login', 'Iniciar sesión'], ['/rol', 'Registrarse']]],
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Reveal className={styles.band}>
        <div>
          <h2>El siguiente paso<br />es cuidar de ti.</h2>
          <p>Crea tu cuenta y encuentra tu espacio en DocSmart.</p>
          <Link href="/rol" className={home.white}>Comenzar con DocSmart <ArrowRight size={19} aria-hidden="true" /></Link>
        </div>
        <Image className={styles.bymax} src="/images/logoSentado.png" width={210} height={210} alt="" />
      </Reveal>

      <div className={styles.grid}>
        <div>
          <Link href="/" className={styles.brand} aria-label="DocSmart, inicio">
            <span className={styles.face}><Image src="/images/logoCara.png" width={26} height={26} alt="" /></span>
            <span>Doc<strong>Smart</strong></span>
          </Link>
          <p>Citas, conversaciones e información médica, en un mismo lugar.</p>
        </div>

        {columnas.map(([titulo, enlaces]) => (
          <nav key={titulo} aria-label={titulo}>
            <h3>{titulo}</h3>
            {enlaces.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
        ))}
      </div>

      <div className={styles.legal}>
        <span>DocSmart apoya la gestión de la atención; las decisiones clínicas corresponden a los profesionales de salud.</span>
        <span>Proyecto formativo del SENA</span>
      </div>
    </footer>
  );
}
