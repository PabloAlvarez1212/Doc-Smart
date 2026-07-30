'use client'
import styles from "./StaticCards.module.css"
import Cards from "../../../ui/Card/Cards"
import { useDashboardPaciente } from "../useDashboardPaciente"

export default function StaticCards({ dashboard, noLeidas }) {
    const { loading } = useDashboardPaciente()

    if (loading) return <p>Cargando...</p>

    return (
        <div className={styles.containerMain}>
            <div className={styles.containerCards}>
                <div className={styles.card}>
                    <Cards
                        image="/icons/cita_medica.png"
                        title={dashboard?.estadisticas.cantidad_proximas_citas ?? 0}
                        align="center"
                        description="Próximas citas"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        image="/icons/pendiente.png"
                        title={dashboard?.estadisticas.consultas_pendientes ?? 0}
                        align="center"
                        description="Consultas pendientes por confirmar"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        image="/icons/realizado.png"
                        title={dashboard?.estadisticas.consultas_realizadas_mes ?? 0}
                        align="center"
                        description="Consultas realizadas este mes"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        image="/icons/notificacion.png"
                        title={noLeidas}  // ← Recibido desde las props de page.js
                        align="center"
                        description="Notificaciones sin leer"
                        className={styles.itemCard}
                    />
                </div>
            </div>
        </div>
    )
}