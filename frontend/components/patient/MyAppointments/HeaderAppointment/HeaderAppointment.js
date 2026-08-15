import styles from "./HeaderAppointment.module.css"
export default function HeaderAppointement({estado,cambiarEstado}){
    return(
        <div className={styles.containerMain}>
            <div className={styles.filtros}>
                <p className={estado === "todas" ? styles.activo : ""}  onClick={() => cambiarEstado("todas")}>Todas</p>
                <p className={estado === "pendiente" ? styles.activo : ""} onClick={() => cambiarEstado("pendiente")}>Pendientes</p>
                <p className={estado === "confirmada" ? styles.activo : ""} onClick={() => cambiarEstado("confirmada")}>Confirmadas</p>
                <p className={estado === "reprogramada" ? styles.activo : ""} onClick={() => cambiarEstado("reprogramada")}>Reprogramadas</p>
                <p className={estado === "completada" ? styles.activo : ""} onClick={() => cambiarEstado("completada")}>Completadas</p>
                <p className={estado === "cancelada" ? styles.activo : ""} onClick={() => cambiarEstado("cancelada")}>Canceladas</p>
            </div>
        </div>
    )
}