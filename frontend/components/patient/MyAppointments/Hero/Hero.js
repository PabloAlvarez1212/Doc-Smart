import { CalendarRange } from "lucide-react";
import styles from "./Hero.module.css";

export default function Hero() {
    return (
        <header className={styles.hero}>
            <span aria-hidden="true"><CalendarRange size={23} /></span>
            <div>
                <h1>Mis citas</h1>
                <p>Consulta tu agenda, encuentra una cita específica y gestiona las acciones disponibles.</p>
            </div>
        </header>
    );
}
