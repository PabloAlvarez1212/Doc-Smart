import styles from "./HeaderAppointments.module.css";


export default function HeaderAppointment({
    estado,
    cambiarEstado,
    resumen
}) {

    const estados = [
        {
            value: "todas",
            label: "Todas",
            count: resumen?.total ?? 0,
        },
        {
            value: "pendiente",
            label: "Pendientes",
            count: resumen?.pendientes ?? 0,
        },
        {
            value: "confirmada",
            label: "Confirmadas",
            count: resumen?.confirmadas ?? 0,
        },
        {
            value: "reprogramada",
            label: "Reprogramadas",
            count: resumen?.reprogramadas ?? 0,
        },
        {
            value: "completada",
            label: "Completadas",
            count: resumen?.completadas ?? 0,
        },
        {
            value: "cancelada",
            label: "Canceladas",
            count: resumen?.canceladas ?? 0,
        },
    ];


    return (
        <section
            className={styles.container}
            aria-label="Filtrar citas por estado"
        >

            <div className={styles.tabs}>

                {estados.map((item) => {

                    const activo =
                        estado === item.value;

                    return (
                        <button
                            key={item.value}
                            type="button"
                            className={`
                                ${styles.tab}
                                ${activo ? styles.active : ""}
                            `}
                            onClick={() =>
                                cambiarEstado(item.value)
                            }
                            aria-pressed={activo}
                        >

                            <span>
                                {item.label}
                            </span>

                            <span
                                className={styles.count}
                            >
                                {item.count}
                            </span>

                        </button>
                    );

                })}

            </div>

        </section>
    );
}