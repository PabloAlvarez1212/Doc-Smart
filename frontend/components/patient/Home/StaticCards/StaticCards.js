'use client'
import styles from "./StaticCards.module.css"
import Cards from "../../../ui/Card/Cards"
import {
    CalendarX,
    CalendarDays,
    Clock3,
    CircleCheckBig
} from "lucide-react"
export default function StaticCards({ 
    dashboard, 
    cantidadProximasCitas, 
    consultasPendientes, 
    consultasRealizadas ,
    consultasCanceladas,
}) {
    // Tomamos los valores en tiempo real pasados por props, o los del dashboard como fallback
    const proximasCitasCount = cantidadProximasCitas ?? dashboard?.estadisticas?.cantidad_proximas_citas ?? 0;
    const pendientesCount = consultasPendientes ?? dashboard?.estadisticas?.consultas_pendientes ?? 0;
    const realizadasCount = consultasRealizadas ?? dashboard?.estadisticas?.consultas_realizadas_mes ?? 0;
    const canceladasCount = consultasCanceladas ?? dashboard?.estadisticas?.consultas_canceladas_mes ?? 0;

    return (
        <div className={styles.containerMain}>
            <div className={styles.containerCards}>
                <div className={styles.card}>
                    <Cards
                        icono={<CalendarDays color="#3B82F6" className={styles.icon}/>}
                        title={proximasCitasCount}
                        align="center"
                        description="Próximas citas"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        icono={<Clock3 color="#F59E0B" className={styles.icon} />}
                        title={pendientesCount}
                        align="center"
                        description="Consultas pendientes por confirmar"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        icono={<CircleCheckBig color="#22C55E" className={styles.icon}/>}
                        title={realizadasCount}
                        align="center"
                        description="Consultas realizadas este mes"
                        className={styles.itemCard}
                    />
                </div>
                <div className={styles.card}>
                    <Cards
                        icono={<CalendarX color="#EF4444" className={styles.icon}/>}
                        title={canceladasCount}
                        align="center"
                        description="Consultas canceladas este mes"
                        className={styles.itemCard}
                    />
                </div>
            </div>
        </div>
    )
}