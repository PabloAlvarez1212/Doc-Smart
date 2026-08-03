"use client";

import styles from "./StaticCards.module.css";
import Cards from "../../../ui/Card/Cards";

export default function StaticCards({ dashboard }) {

    const pacientesTotales =
        dashboard?.estadisticas?.pacientes_totales ?? 0;

    const citasHoy =
        dashboard?.estadisticas?.citas_hoy ?? 0;

    const recetasEmitidas =
        dashboard?.estadisticas?.recetas_emitidas ?? 0;

    const diagnosticos =
        dashboard?.estadisticas?.diagnosticos ?? 0;

    return (
        <div className={styles.containerMain}>
            <div className={styles.containerCards}>

                <div className={styles.card}>
                    <Cards
                        image="/icons/cita-medica.png"
                        title={pacientesTotales}
                        align="center"
                        description="Pacientes Totales"
                        className={styles.itemCard}
                    />
                </div>

                <div className={styles.card}>
                    <Cards
                        image="/icons/medico.png"
                        title={citasHoy}
                        align="center"
                        description="Citas de Hoy"
                        className={styles.itemCard}
                    />
                </div>

                <div className={styles.card}>
                    <Cards
                        image="/icons/pendiente-medico.png"
                        title={recetasEmitidas}
                        align="center"
                        description="Recetas Emitidas"
                        className={styles.itemCard}
                    />
                </div>

                <div className={styles.card}>
                    <Cards
                        image="/icons/realizado-medico.png"
                        title={diagnosticos}
                        align="center"
                        description="Diagnósticos"
                        className={styles.itemCard}
                    />
                </div>

            </div>
        </div>
    );
}