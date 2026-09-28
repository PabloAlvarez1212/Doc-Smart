"use client";

import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
const percentageFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

function colorForState(state, index) {
    const normalized = String(state ?? "").trim().toLocaleLowerCase("es-CO");
    return stateColors[normalized] ?? fallbackColors[index % fallbackColors.length];
}

function formatState(state) {
    const label = String(state ?? "Sin estado").trim();
    return label.charAt(0).toLocaleUpperCase("es-CO") + label.slice(1).toLocaleLowerCase("es-CO");
}

function formatPercentage(value) {
    return percentageFormatter.format(value);
}

function StatusTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload;

    return (
        <div className={styles.statusTooltip}>
            <strong>{formatState(item.estado)}</strong>
            <span>{item.total} {item.total === 1 ? "cita" : "citas"}</span>
            <span>{formatPercentage(item.porcentaje)}% del total</span>
        </div>
    );
}

function DonutCenterLabel({ viewBox, total }) {
    if (!viewBox) return null;

    const { cx, cy } = viewBox;

    return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
            <tspan x={cx} dy="-0.15em" className={styles.donutTotal}>{total}</tspan>
            <tspan x={cx} dy="1.7em" className={styles.donutTotalLabel}>Total citas</tspan>
        </text>
    );
}

export default function AppointmentStatusChart({ data }) {
    const totalAppointments = data.reduce(
        (total, item) => total + Math.max(0, Number(item.total) || 0),
        0
    );
    const distribution = data.map((item) => {
        const total = Math.max(0, Number(item.total) || 0);

        return {
            ...item,
            total,
            porcentaje: totalAppointments > 0
                ? (total / totalAppointments) * 100
                : 0,
        };
    });

    return (
        <div className={styles.statusDistribution} aria-label="Citas programadas por estado">
            <div className={styles.statusChartArea}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={distribution}
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
                            {distribution.map((item, index) => (
                                <Cell key={`${item.estado}-${index}`} fill={colorForState(item.estado, index)} />
                            ))}
                            <Label content={(props) => <DonutCenterLabel {...props} total={totalAppointments} />} />
                        </Pie>
                        <Tooltip content={<StatusTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className={styles.statusBreakdown}>
                <div className={styles.statusBreakdownHeader} aria-hidden="true">
                    <span>Estado</span>
                    <span>Cantidad</span>
                    <span>Porcentaje</span>
                </div>
                <ul className={styles.statusLegend} aria-label="Cantidad y porcentaje por estado">
                    {distribution.map((item, index) => (
                        <li className={styles.statusLegendItem} key={`${item.estado}-${index}`}>
                            <span className={styles.statusName}>
                                <span
                                    className={styles.legendSwatch}
                                    style={{ "--segment-color": colorForState(item.estado, index) }}
                                    aria-hidden="true"
                                />
                                {formatState(item.estado)}
                            </span>
                            <span className={styles.statusCount}>
                                {item.total} <small>{item.total === 1 ? "cita" : "citas"}</small>
                            </span>
                            <strong className={styles.statusPercentage}>
                                {formatPercentage(item.porcentaje)}%
                            </strong>
                        </li>
                    ))}
                </ul>
                <p className={styles.statusTotalSummary}>
                    Porcentajes calculados sobre <strong>{totalAppointments}</strong> {totalAppointments === 1 ? "cita" : "citas"}.
                </p>
            </div>
        </div>
    );
}
