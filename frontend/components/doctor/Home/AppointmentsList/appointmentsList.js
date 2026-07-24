import styles from "./appointmentsList.module.css"
import { ChevronRight } from "lucide-react"

export default function AppointmentsList() {
    const citas = [
        { iniciales: "MG", nombre: "Pablito Script", tipo: "Consulta general", hora: "10:00 AM" },
        { iniciales: "CL", nombre: "Kleider Botcito", tipo: "Control seguimiento", hora: "11:30 AM" },
        { iniciales: "AM", nombre: "Ana Martínez", tipo: "Consulta general", hora: "02:00 PM" },
    ]

    return (
        <div className={styles.containerMain}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h2>Citas de Hoy</h2>
                    <a className={styles.link}>
                        Ver agenda <ChevronRight size={16} />
                    </a>
                </div>
                <div className={styles.list}>
                    {citas.map((cita, index) => (
                        <div className={styles.row} key={index}>
                            <div className={styles.container}>
                                <div className={styles.avatar}>{cita.iniciales}</div>
                                <div className={styles.description}>
                                    <h3>{cita.nombre}</h3>
                                    <p>{cita.tipo}</p>
                                </div>
                            </div>
                            <p className={styles.hora}>{cita.hora}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}