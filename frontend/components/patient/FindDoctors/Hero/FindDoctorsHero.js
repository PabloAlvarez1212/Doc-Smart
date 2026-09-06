import { ShieldCheck } from "lucide-react";
import styles from "./FindDoctorsHero.module.css";

export default function FindDoctorsHero({ total, loading = false, error = false }) {
    const countLabel = loading
        ? "Cargando médicos…"
        : error
            ? "Directorio no disponible"
            : `${total} ${total === 1 ? "médico encontrado" : "médicos encontrados"}`;

    return (
        <header className={styles.hero}>
            <div className={styles.heading}>
                <div>
                    <p className={styles.eyebrow}>Directorio médico</p>
                    <h1>Encontrar doctores</h1>
                    <p className={styles.description}>
                        Explora especialistas y consulta su ubicación para encontrar la atención que necesitas.
                    </p>
                </div>
            </div>
            <div className={styles.counter} aria-live="polite">
                <ShieldCheck size={20} aria-hidden="true" />
                <div>
                    <strong>{countLabel}</strong>
                    <span>Profesionales de DocSmart</span>
                </div>
            </div>
        </header>
    );
}
