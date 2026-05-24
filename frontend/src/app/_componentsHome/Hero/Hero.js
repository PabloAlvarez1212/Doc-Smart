"use client";
import styles from "./Hero.module.css";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Clock10 } from "lucide-react";
import { Lock } from "lucide-react";
import { LucideFileSearchCorner } from "lucide-react";
import Image from "next/image";

const trustItems = [
    { icon: <Lock/>, text: "Datos encriptados" },
    { icon: <Clock10/>, text: "Disponible 24/7" },
    { icon: <LucideFileSearchCorner/>, text: "Certificado en salud" },
    { icon: <Star/>, text: "4.9 / 5 valoración" },
];

const previewCards = [
    { color: "#eff6ff", iconColor: "#3b82f6", icon: "📅", title: "Cita agendada", sub: "Dr. Ramírez · Hoy 3:00 PM" },
    { stat: true, bg: 'var(--color-dark)', num: "12k+", lbl: "Pacientes activos" },
    { color: "#f0fdf4", iconColor: "#22c55e", icon: "💬", title: "Nuevo mensaje", sub: "Tu doctor respondió" },
    { color: "#fdf4ff", iconColor: "#a855f7", imgSrc: "/images/messias.jpg", title: "Asistente IA", sub: "Disponible ahora" }, // 👈 cambiado
    { stat: true, bg: "#2458e9", num: "98%", lbl: "Satisfacción" },
    { color: "#fff7ed", iconColor: "#f97316", icon: "📋", title: "Historial clínico", sub: "Siempre disponible" },
];

export default function Hero() {
    const router = useRouter();

    return (
        <section className={styles.container}>
            <div className={styles.glow} aria-hidden="true" />

            <span className={styles.pill}>
                <span className={styles.pulse} aria-hidden="true" />
                Plataforma médica certificada
            </span>

            <h1 className={styles.heading}>
                Tu salud,<br />más <em className={styles.accent}>inteligente</em>
            </h1>

            <p className={styles.heroText}>
                Conectamos pacientes y médicos para una atención moderna,
                segura y eficiente — cuando y donde lo necesitas.
            </p>

            <div className={styles.actions}>
                <button className={styles.ctaMain} onClick={() => router.push('/rol')}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
                    Comenzar ahora
                </button>

            </div>

            <div className={styles.trustBar}>
                {trustItems.map((item, i) => (
                    <span key={i} className={styles.trustItem}>
                        <span aria-hidden="true">{item.icon}</span> {item.text}
                    </span>
                ))}
            </div>

            <div className={styles.previewGrid}>
                {previewCards.map((card, i) =>
                    card.stat ? (
                        <div key={i} className={styles.statCard} style={{ background: card.bg }}>
                            <span className={styles.statNum}>{card.num}</span>
                            <span className={styles.statLbl}>{card.lbl}</span>
                        </div>
                    ) : (
                        
                        <div key={i} className={styles.previewCard}>
                            <div className={styles.previewIcon} style={{ background: card.color }}>
                                {card.imgSrc ? (
                                    <Image
                                        src={card.imgSrc}
                                        width={28}
                                        height={28}
                                        alt={card.title}
                                        style={{ objectFit: 'contain' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: 18 }}>{card.icon}</span>
                                )}
                            </div>
                            <span className={styles.previewTitle}>{card.title}</span>
                            <span className={styles.previewSub}>{card.sub}</span>
                        </div>
                    )
                )}
            </div>
        </section>
    );
}