"use client";

import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import styles from "./DoctorStats/DoctorStats.module.css";

const stateLabels = {
    aprobado: "Aprobado",
    pendiente: "Pendiente",
    rechazado: "Rechazado",
    sin_solicitud: "Sin solicitud",
};
const stateColors = {
    aprobado: "#13796f",
    pendiente: "#a8640b",
    rechazado: "#b42335",
    sin_solicitud: "#64748b",
};
const percentageFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function normalizeState(state) {
    return String(state ?? "").trim().toLocaleLowerCase("es-CO");
}

function labelForState(state) {
    const normalized = normalizeState(state);
    const fallback = normalized.replaceAll("_", " ");

    return stateLabels[normalized]
        ?? (fallback.charAt(0).toLocaleUpperCase("es-CO") + fallback.slice(1));
}

function colorForState(state) {
    return stateColors[normalizeState(state)] ?? "#7257b5";
}

function formatPercentage(value) {
    return percentageFormatter.format(value);
}

function ValidationStatusTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload;

    return (
        <div className={styles.validationStatusTooltip}>
            <strong>{item.estado_label}</strong>
            <span>{item.total_medicos} {item.total_medicos === 1 ? "médico" : "médicos"}</span>
            <span>{formatPercentage(item.porcentaje)}% del total</span>
        </div>
    );
}

function DonutCenterLabel({ viewBox, total }) {
    if (!viewBox) return null;

    const { cx, cy } = viewBox;

    return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
            <tspan x={cx} dy="-0.15em" className={styles.validationDonutTotal}>{total}</tspan>
            <tspan x={cx} dy="1.7em" className={styles.validationDonutLabel}>Total médicos</tspan>
        </text>
    );
}

export default function DoctorsValidationStatusChart({ data }) {
    const totalDoctors = data.reduce(
        (total, item) => total + Math.max(0, Number(item.total_medicos) || 0),
        0
    );
    const displayData = data.map((item) => {
        const total = Math.max(0, Number(item.total_medicos) || 0);

        return {
            ...item,
            total_medicos: total,
            estado_label: labelForState(item.estado),
            porcentaje: totalDoctors > 0
                ? (total / totalDoctors) * 100
                : 0,
        };
    });

    return (
        <div className={styles.validationDistribution} aria-label="Distribución por estado de validación">
            <div className={styles.validationChartArea}>
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
                            {displayData.map((item, index) => (
                                <Cell key={`${item.estado}-${index}`} fill={colorForState(item.estado)} />
                            ))}
                            <Label content={(props) => <DonutCenterLabel {...props} total={totalDoctors} />} />
                        </Pie>
                        <Tooltip content={<ValidationStatusTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className={styles.validationBreakdown}>
                <div className={styles.validationBreakdownHeader} aria-hidden="true">
                    <span>Estado</span>
                    <span>Cantidad</span>
                    <span>Porcentaje</span>
                </div>
                <ul className={styles.validationLegend} aria-label="Cantidad y porcentaje por estado de validación">
                    {displayData.map((item, index) => (
                        <li className={styles.validationLegendItem} key={`${item.estado}-${index}`}>
                            <span className={styles.validationStateName}>
                                <span
                                    className={styles.validationSwatch}
                                    style={{ "--segment-color": colorForState(item.estado) }}
                                    aria-hidden="true"
                                />
                                {item.estado_label}
                            </span>
                            <span className={styles.validationStateCount}>
                                {item.total_medicos} <small>{item.total_medicos === 1 ? "médico" : "médicos"}</small>
                            </span>
                            <strong className={styles.validationStatePercentage}>
                                {formatPercentage(item.porcentaje)}%
                            </strong>
                        </li>
                    ))}
                </ul>
                <p className={styles.validationTotalSummary}>
                    Porcentajes calculados sobre <strong>{totalDoctors}</strong> {totalDoctors === 1 ? "médico" : "médicos"}.
                </p>
            </div>
        </div>
    );
}
