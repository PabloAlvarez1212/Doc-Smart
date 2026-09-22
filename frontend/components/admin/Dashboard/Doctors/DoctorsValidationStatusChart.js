"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import styles from "./DoctorStats/DoctorStats.module.css";

const stateLabels = {
    aprobado: "Aprobados",
    pendiente: "Pendientes",
    rechazado: "Rechazados",
    sin_solicitud: "Sin solicitud",
};
const stateColors = {
    aprobado: "#13796f",
    pendiente: "#a8640b",
    rechazado: "#b42335",
    sin_solicitud: "#64748b",
};

export default function DoctorsValidationStatusChart({ data }) {
    const displayData = data.map((item) => ({
        ...item,
        estado_label: stateLabels[item.estado] ?? String(item.estado).replaceAll("_", " "),
    }));

    return (
        <div aria-label="Estado actual de validación de médicos">
            <div className={`${styles.chartArea} ${styles.donutArea}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={displayData}
                            dataKey="total_medicos"
                            nameKey="estado_label"
                            cx="50%"
                            cy="50%"
                            innerRadius="58%"
                            outerRadius="82%"
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={2}
                        >
                            {data.map((item, index) => (
                                <Cell key={`${item.estado}-${index}`} fill={stateColors[item.estado] ?? "#7257b5"} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value, name) => [`${value} médicos`, name]}
                            contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className={styles.legend} aria-label="Totales por estado de validación">
                {displayData.map((item, index) => (
                    <li className={styles.legendItem} key={`${item.estado}-${index}`}>
                        <span
                            className={styles.legendSwatch}
                            style={{ "--segment-color": stateColors[item.estado] ?? "#7257b5" }}
                            aria-hidden="true"
                        />
                        <span>{item.estado_label}</span>
                        <span className={styles.legendValue}>{item.total_medicos}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
