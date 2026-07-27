import styles from "./StaticCards.module.css"
import Cards from "../../../ui/Card/Cards"
import { Users, Calendar, FileText, ClipboardList } from "lucide-react"

export default function StaticCards() {
    return (
        <div className={styles.containerMain}>
            <div className={styles.containerCards}>
                <div className={styles.card}>
                    <Cards
                        className={styles.itemCard}
                        variant="compact"
                        align="left"
                        title="142"
                        description="Pacientes Totales"
                    />
                    <Users size={18} className={styles.iconGreen} />
                    <p className={styles.trend}>+3 este mes</p>
                </div>

                <div className={styles.card}>
                    <Cards
                        className={styles.itemCard}
                        variant="compact"
                        align="left"
                        title="8"
                        description="Citas Hoy"
                    />
                    <Calendar size={18} className={styles.iconBlue} />
                    <p className={styles.trend}>Próxima a las 10:00</p>
                </div>

                <div className={styles.card}>
                    <Cards
                        className={styles.itemCard}
                        variant="compact"
                        align="left"
                        title="35"
                        description="Recetas Emitidas"
                    />
                    <FileText size={18} className={styles.iconPurple} />
                    <p className={styles.trend}>Este mes</p>
                </div>

                <div className={styles.card}>
                    <Cards
                        className={styles.itemCard}
                        variant="compact"
                        align="left"
                        title="28"
                        description="Diagnósticos"
                    />
                    <ClipboardList size={18} className={styles.iconOrange} />
                    <p className={styles.trend}>Este mes</p>
                </div>
            </div>
        </div>
    )
}