import {Search, CalendarDays, X } from "lucide-react";
import styles from "./FilterAppointments.module.css";

export default function FilterAppointments({
    paciente,
    fecha,
    cambiarPaciente,
    cambiarFecha,
    limpiarFiltros,
}) {

    const hayFiltros =
        paciente.trim() !== "" ||
        fecha !== "";

    return (
        <section className={styles.container}>
            <div className={styles.searchField}>
                <Search
                    size={18}
                    aria-hidden="true"
                />
                <input
                    type="text"
                    placeholder="Buscar paciente..."
                    value={paciente}
                    onChange={(e) =>
                        cambiarPaciente(e.target.value)
                    }
                />
            </div>

            <div className={styles.dateField}>
                <CalendarDays
                    size={18}
                    aria-hidden="true"
                />
                <input
                    type="date"
                    value={fecha}
                    onChange={(e) =>
                        cambiarFecha(e.target.value)
                    }
                />
            </div>


            {hayFiltros && (
                <button
                    type="button"
                    className={styles.clearButton}
                    onClick={limpiarFiltros}
                >
                    <X size={16} />
                    Limpiar
                </button>

            )}
        </section>
    );
}