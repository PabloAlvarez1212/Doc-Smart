import { Bell, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";

export default function Hero({ nombre, noLeidas, foto_perfil }) {
    const primerNombre = String(nombre || "Paciente").trim().split(/\s+/)[0];
    const unreadCount = Number.isFinite(Number(noLeidas))
        ? Math.max(0, Number(noLeidas))
        : 0;

    return (
        <header className={styles.hero}>
            <div className={styles.identity}>
                <div className={styles.avatar}>
                    <Image
                        src={foto_perfil || "/images/foto_default.png"}
                        alt={`Foto de perfil de ${primerNombre}`}
                        width={68}
                        height={68}
                        priority
                    />
                </div>
                <div className={styles.copy}>
                    <h1>Hola, {primerNombre}</h1>
                    <p>Tu información de salud y tus próximos pasos, en un solo lugar.</p>
                </div>
            </div>

            <Link className={styles.notifications} href="/patient/notifications">
                <span className={styles.notificationIcon} aria-hidden="true"><Bell size={19} /></span>
                <span>
                    <strong>{unreadCount}</strong>
                    <small>{unreadCount === 1 ? "notificación sin leer" : "notificaciones sin leer"}</small>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
            </Link>
        </header>
    );
}
