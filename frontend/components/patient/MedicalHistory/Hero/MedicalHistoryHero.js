import { FileHeart, ShieldCheck } from "lucide-react";
import styles from "./MedicalHistoryHero.module.css";

export default function MedicalHistoryHero({ total }) {
    return (
        <header className={styles.hero}>
            <div className={styles.heading}>
                <span className={styles.icon} aria-hidden="true"><FileHeart color="black" /></span>
                <div>
                    <p className={styles.eyebrow}>Tu expediente de salud</p>
                    <h1>Historial clínico</h1>
                    <p className={styles.description}>Consulta el registro de tus atenciones y diagnósticos médicos en orden cronológico.</p>
                </div>
            </div>
            <div className={styles.recordCount} aria-label={`${total} consultas registradas`}>
                <ShieldCheck size={20} aria-hidden="true" />
                <div><strong>{total} consultas</strong><span>Expediente privado</span></div>
            </div>
        </header>
    );
}
