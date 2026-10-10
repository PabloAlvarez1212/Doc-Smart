"use client";

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Settings } from 'lucide-react';

import styles from './DocSmartNav.module.css';
export default function DocSmartNav({
  links = [],
  home = '/',
  onSettings,
  sessionHome,
  sessionLoading = false
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const id = useId();
  const [openPath, setOpenPath] = useState(null);
  const open = openPath === pathname;
  const [compact, setCompact] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const toggle = useRef(null);
  const root = useRef(null);
  useEffect(() => {
    const scroll = () => {
      setCompact(window.scrollY > 24);
      const section = ['funcionalidades', 'comunidad'].filter(id => document.getElementById(id)?.getBoundingClientRect().top <= 160).at(-1);
      setActiveHash(section || '');
    };
    scroll();
    window.addEventListener('scroll', scroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', scroll);
  }, []);
  useEffect(() => {
    const outside = e => {
      if (root.current && !root.current.contains(e.target)) setOpenPath(null);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return <header className={styles.reserve}><div ref={root} className={`${styles.bar} ${compact ? styles.compact : ''}`} onKeyDown={e => {
      if (e.key === 'Escape' && open) {
        setOpenPath(null);
        toggle.current?.focus();
      }
    }} onBlur={e => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpenPath(null);
    }}>
 <div className={styles.top}><Link href={home} className={styles.logo} aria-label="DocSmart, inicio"><Image src="/images/logoSentado.png" width={40} height={40} alt="" priority /><span>Doc<strong>Smart</strong></span></Link>
 
 <div className={styles.actions}>{onSettings ? <button className={styles.settings} type="button" aria-label="Abrir Configuración" onClick={onSettings}><Settings size={19} /></button> : sessionHome ? <Link className={styles.primary} href={sessionHome}>Mi espacio</Link> : sessionLoading ? <span role="status">Comprobando sesión…</span> : <><Link className={styles.login} href="/login">Iniciar sesión</Link><Link className={styles.primary} href="/rol">Registrarse</Link></>}
 <button ref={toggle} type="button" className={styles.toggle} aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls={id} onClick={() => setOpenPath(open ? null : pathname)}><span className={open ? styles.cross : ''}><i /><i /></span></button></div></div>
 <div id={id} className={`${styles.navigation} ${open ? styles.open : ''}`}><nav aria-label="Navegación principal"><ul>{links.map(({
              href,
              label
            }) => {
              const active = href.includes('#') ? activeHash === href.split('#')[1] : pathname === href && !activeHash || pathname.startsWith(href + '/');
              return <li key={href}><Link href={href} aria-current={active ? 'page' : undefined} onClick={() => setOpenPath(null)} className={`${styles.link} ${active ? styles.active : ''}`}>{active && <motion.span className={styles.indicator} layoutId={`nav-${id}`} transition={reduce ? {
                    duration: 0
                  } : {
                    type: 'spring',
                    bounce: 0,
                    duration: .3
                  }} />}<span>{label}</span></Link></li>;
            })}</ul></nav><div className={styles.mobileTheme}>{!onSettings && !sessionHome && !sessionLoading && <Link className={styles.mobileLogin} href="/login" onClick={() => setOpenPath(null)}>Iniciar sesión</Link>}</div></div>
 </div></header>;
}
