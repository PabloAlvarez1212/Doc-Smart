'use client'
import styles from "./StaticCards.module.css"
import Cards from "../../../ui/Card/Cards"

export default function StaticCards({ 
    dashboard, 
    noLeidas, 
    cantidadProximasCitas, 
    consultasPendientes, 
    consultasRealizadas 
}) {
    // Tomamos los valores en tiempo real pasados por props, o los del dashboard como fallback
    const proximasCitasCount = cantidadProximasCitas ?? dashboard?.estadisticas?.cantidad_proximas_citas ?? 0;
    const pendientesCount = consultasPendientes ?? dashboard?.estadisticas?.consultas_pendientes ?? 0;
    const realizadasCount = consultasRealizadas ?? dashboard?.estadisticas?.consultas_realizadas_mes ?? 0;

    return (
        <div className={styles.containerMain}>
            <div className={styles.containerCards}>
                <div className={styles.card}>
                    <Cards
                        image="/icons/cita_medica.png"
                        title={proximasCitasCount}
                        align="center"
                        description="Próximas citas"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        image="/icons/pendiente.png"
                        title={pendientesCount}
                        align="center"
                        description="Consultas pendientes por confirmar"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        image="/icons/realizado.png"
                        title={realizadasCount}
                        align="center"
                        description="Consultas realizadas este mes"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        image="/icons/notificacion.png"
                        title={noLeidas ?? 0}
                        align="center"
                        description="Notificaciones sin leer"
                        className={styles.itemCard}
                    />
                </div>
            </div>
        </div>
    )
}