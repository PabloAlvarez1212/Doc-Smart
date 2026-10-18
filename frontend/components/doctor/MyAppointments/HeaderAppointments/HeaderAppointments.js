import styles from "./HeaderAppointments.module.css";


export default function HeaderAppointment({
    seccion = "agenda",
    estado,
    cambiarEstado,
    resumen
}) {

    const pendientes = resumen?.pendientes ?? 0;
    const confirmadas = resumen?.confirmadas ?? 0;
    const reprogramadas = resumen?.reprogramadas ?? 0;

    const completadas = resumen?.completadas ?? 0;
    const canceladas = resumen?.canceladas ?? 0;
    const vencidas = resumen?.vencidas ?? 0;
    const inasistencias = resumen?.inasistencias ?? 0;

    const estadosAgenda = [
        {
            value: "todas",
            label: "Todas",
            count: pendientes + confirmadas + reprogramadas,
        },
        {
            value: "pendiente",
            label: "Pendientes",
            count: pendientes,
        },
        {
            value: "confirmada",
            label: "Confirmadas",
            count: confirmadas,
        },
        {
            value: "reprogramada",
            label: "Reprogramadas",
            count: reprogramadas,
        },
    ];

    const estadosHistorial = [
        {
            value: "todas",
            label: "Todas",
            count: completadas + canceladas + vencidas + inasistencias,
        },
        {
            value: "completada",
            label: "Completadas",
            count: completadas,
        },
        {
            value: "cancelada",
            label: "Canceladas",
            count: canceladas,
        },
        {
            value: "vencida",
            label: "Vencidas",
            count: vencidas,
        },
        {
            value: "inasistencia_paciente",
            label: "Inasistencias",
            count: inasistencias,
        },
    ];

    const estados =
        seccion === "agenda"
            ? estadosAgenda
            : estadosHistorial;


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