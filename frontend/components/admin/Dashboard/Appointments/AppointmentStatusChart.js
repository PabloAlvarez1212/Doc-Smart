"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";

const stateColors = {
    completada: "#13796f",
    completado: "#13796f",
    pendiente: "#a8640b",
    confirmada: "#2563eb",
    cancelada: "#b42335",
    cancelado: "#b42335",
};
const fallbackColors = ["#7257b5", "#4e789b", "#64748b"];

function colorForState(state, index) {
    const normalized = String(state ?? "").trim().toLocaleLowerCase("es-CO");
    return stateColors[normalized] ?? fallbackColors[index % fallbackColors.length];
}

export default function AppointmentStatusChart({ data }) {
    return (
        <div aria-label="Distribución de citas por estado">
            <div className={`${styles.chartArea} ${styles.donutArea}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="total"
                            nameKey="estado"
                            cx="50%"
                            cy="50%"
                            innerRadius="58%"
                            outerRadius="82%"
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {data.map((item, index) => (
                                <Cell key={`${item.estado}-${index}`} fill={colorForState(item.estado, index)} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [`${value} citas`, name]}
                            contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className={styles.legend} aria-label="Totales por estado">
                {data.map((item, index) => (
                    <li className={styles.legendItem} key={`${item.estado}-${index}`}>
                        <span className={styles.legendSwatch} style={{ "--segment-color": colorForState(item.estado, index) }} aria-hidden="true" />
                        <span>{item.estado}</span>
                        <span className={styles.legendValue}>{item.total}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
