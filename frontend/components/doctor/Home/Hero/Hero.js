import styles from "./Hero.module.css"
import { Stethoscope } from "lucide-react"

export default function Hero() {
    return (
        <div className={styles.containerMain}>
            <div className={styles.saludo}>
                <div className={styles.containerText}>
                    <p>Bienvenido de vuelta</p>
                    <h2>Dr. Miguel Racero</h2>
                    <p>Medicina General · jueves, 23 de julio de 2026</p>
                </div>
                <div className={styles.iconWrapper}>
                    <Stethoscope size={22} color="white" />
                </div>
            </div>
        </div>
    )
}