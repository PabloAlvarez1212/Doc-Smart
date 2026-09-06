import { Search, ShieldCheck } from "lucide-react";
import styles from "./FindDoctorsHero.module.css";

export default function FindDoctorsHero({ total }) {
    return (
        <header className={styles.hero}>
            <div className={styles.heading}>
                <span className={styles.icon} aria-hidden="true">
                    <Search size={27} />
                </span>
                <div>
                    <p className={styles.eyebrow}>Directorio médico</p>
                    <h1>Encontrar doctores</h1>
                    <p className={styles.description}>
                        Compara especialistas, ubicación y próximos horarios para elegir tu atención.
                    </p>
                </div>
            </div>
            <div className={styles.counter} aria-live="polite">
                <ShieldCheck size={20} aria-hidden="true" />
                <div>
                    <strong>{total} {total === 1 ? "médico encontrado" : "médicos encontrados"}</strong>
                    <span>Profesionales de DocSmart</span>
                </div>
            </div>
        </header>
    );
}
