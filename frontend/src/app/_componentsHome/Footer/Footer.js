"use client";
import { useRouter } from "next/navigation";
import styles from "./Footer.module.css";

const stats = [
    { num: "12k+", lbl: "Pacientes" },
    { num: "850+", lbl: "Médicos" },
    { num: "24/7", lbl: "Soporte" },
];

const links = ["Privacidad", "Términos", "Contacto", "Ayuda"];

export default function Footer() {
    const router = useRouter();

    return (
        <footer className={styles.container}>
            <div className={styles.orb1} aria-hidden="true" />
            <div className={styles.orb2} aria-hidden="true" />

            <span className={styles.badge}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                Únete hoy gratis
            </span>

            <h2 className={styles.title}>¿Listo para comenzar?</h2>
            <p className={styles.footerText}>
                Únete a miles de profesionales y pacientes que confían en DocSmart
            </p>

            <div className={styles.stats}>
                {stats.map((s, i) => (
                    <div key={i} className={styles.stat}>
                        <span className={styles.statNum}>{s.num}</span>
                        <span className={styles.statLbl}>{s.lbl}</span>
                    </div>
                ))}
            </div>

            <button className={styles.cta} onClick={() => router.push('/login')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                Acceder a la plataforma
            </button>

            <div className={styles.footerLinks}>
                {links.map((l, i) => (
                    <span key={i} className={styles.footerLink}>{l}</span>
                ))}
            </div>
        </footer>
    );
}