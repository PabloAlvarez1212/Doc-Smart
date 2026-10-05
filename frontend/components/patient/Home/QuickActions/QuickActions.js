import { ArrowRight, CalendarDays, FileHeart, Search, UserRound } from "lucide-react";
import Link from "next/link";
import styles from "./QuickActions.module.css";

const primaryAction = {
    href: "/patient/find-doctors",
    label: "Encontrar un doctor",
    description: "Busca por especialidad y ubicación",
    icon: Search,
};

const secondaryActions = [
    { href: "/patient/my-appointments", label: "Mis citas", icon: CalendarDays },
    { href: "/patient/my-medical-history", label: "Historial clínico", icon: FileHeart },
    { href: "/patient/my-profile", label: "Mi perfil", icon: UserRound },
];

export default function QuickActions() {
    const PrimaryIcon = primaryAction.icon;

    return (
        <section className={styles.section} aria-labelledby="quick-actions-title">
            <div className={styles.heading}>
                <h2 id="quick-actions-title">¿Qué necesitas hacer?</h2>
                <p>Accesos directos a tus servicios frecuentes.</p>
            </div>

            <nav className={styles.actions} aria-label="Acciones rápidas del paciente">
                <Link className={styles.primary} href={primaryAction.href}>
                    <span className={styles.primaryIcon} aria-hidden="true"><PrimaryIcon size={22} /></span>
                    <span>
                        <strong>{primaryAction.label}</strong>
                        <small>{primaryAction.description}</small>
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <div className={styles.secondary}>
                    {secondaryActions.map(({ href, label, icon: Icon }) => (
                        <Link href={href} key={href}>
                            <span aria-hidden="true"><Icon size={18} /></span>
                            <strong>{label}</strong>
                            <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                    ))}
                </div>
            </nav>
        </section>
    );
}
