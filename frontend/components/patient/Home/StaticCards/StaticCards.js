import styles from "./StaticCards.module.css"
import Cards from "../../../ui/Card/Cards"
export default function StaticCards() {
    return (
        <div className={styles.containerMain}>
            <div className={styles.containerCards}>
                <div className={styles.card}>
                    <Cards image="/icons/cita_medica.png" title="2" align="center" description="Próximas citas" />
                </div>
                <div className={styles.card}>
                    <Cards image="/icons/pendiente.png" title="2" align="center" description="Consultas pendientes por confirmar" />
                </div>
                <div className={styles.card}>
                    <Cards image="/icons/realizado.png" title="2" align="center" description="Consultas realizadas este mes" />
                </div>
                <div className={styles.card}>
                    <Cards image="/icons/notificacion.png" title="2" align="center" description="Notificaciones" />
                </div>
            </div>
        </div>
    )
}