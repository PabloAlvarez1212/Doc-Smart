import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './Footer.module.css';
export default function Footer() {
  return <footer className={styles.footer}><div className={styles.close}><div><h2>El siguiente paso<br />es cuidar de ti.</h2><p>Crea tu cuenta y encuentra tu espacio en DocSmart.</p></div><Link href="/rol">Comenzar con DocSmart <ArrowRight size={19} /></Link></div><div className={styles.bottom}><Link href="/" className={styles.brand}>Doc<strong>Smart</strong></Link><p>Citas, conversaciones e información médica.</p><Link href="/login">Iniciar sesión</Link></div></footer>;
}
