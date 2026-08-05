import styles from "./HeaderAppointment.module.css"
export default function HeaderAppointement(){
    return(
        <div className={styles.containerMain}>
            <div className={styles.filtros}>
                <p>Todas</p>
                <p>Pendientes</p>
                <p>Reprogramadas</p>
                <p>Completadas</p>
                <p>Canceladas</p>
            </div>
        </div>
    )
}