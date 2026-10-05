import styles from "./HeaderAppointment.module.css";

const statuses = [
    ["todas", "Todas"],
    ["pendiente", "Pendientes"],
    ["confirmada", "Confirmadas"],
    ["reprogramada", "Reprogramadas"],
    ["completada", "Completadas"],
    ["cancelada", "Canceladas"],
];

export default function HeaderAppointment({ estado, cambiarEstado }) {
    return (
        <div className={styles.statusBar}>
            <div>
                <h2>Estado de la cita</h2>
                <p>Elige una categoría para acotar tu agenda.</p>
            </div>
            <div className={styles.tabs} aria-label="Filtrar citas por estado">
                {statuses.map(([value, label]) => (
                    <button
                        type="button"
                        className={estado === value ? styles.active : ""}
                        aria-pressed={estado === value}
                        onClick={() => cambiarEstado(value)}
                        key={value}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
