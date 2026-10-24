"use client";

import { useReducedMotion } from "motion/react";

import { Cell, Label, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import styles from "./GraficaEstados.module.css";

const colors = ["var(--doctor-chart-0)", "var(--doctor-chart-1)", "var(--doctor-chart-2)", "var(--doctor-chart-3)", "var(--doctor-chart-4)", "var(--doctor-chart-5)", "var(--doctor-chart-6)"];
const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const percentageFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

const formatState = (value) => {
    const normalized = String(value ?? "Sin estado").replaceAll("_", " ").trim();
    return normalized.charAt(0).toLocaleUpperCase("es-CO")
        + normalized.slice(1).toLocaleLowerCase("es-CO");
};

function StateTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;

    return (
        <div className={styles.tooltip}>
            <strong>{formatState(item.estado)}</strong>
            <span>{numberFormatter.format(item.cantidad)} citas</span>
            <span>{percentageFormatter.format(item.porcentaje)}% del período</span>
        </div>
    );
}

export default function GraficaEstados({ data = [] }) {
    const reduced = useReducedMotion();
    const distribution = data.map((item) => ({
        ...item,
        cantidad: Math.max(0, Number(item.cantidad) || 0),
        porcentaje: Math.max(0, Number(item.porcentaje) || 0),
    }));
    const total = distribution.reduce((sum, item) => sum + item.cantidad, 0);

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <h2>Distribución por estado</h2>
                <p>Estado actual de las citas programadas dentro del período seleccionado.</p>
            </header>

            {total > 0 ? (
                <div className={styles.content}>
                    <div className={styles.chartArea} role="img" aria-label="Distribución de citas por estado">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie isAnimationActive={!reduced} animationDuration={240}
                                    data={distribution}
                                    dataKey="cantidad"
                                    nameKey="estado"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="57%"
                                    outerRadius="81%"
                                    paddingAngle={2}
                                    stroke="var(--surface)"
                                    strokeWidth={2}
                                >
                                    {distribution.map((item, index) => (
                                        <Cell key={`${item.estado}-${index}`} fill={colors[index % colors.length]} />
                                    ))}
                                    <Label
                                        position="center"
                                        content={({ viewBox }) => (
                                            <text x={viewBox?.cx} y={viewBox?.cy} textAnchor="middle" dominantBaseline="middle">
                                                <tspan x={viewBox?.cx} dy="-.18em" className={styles.total}>{numberFormatter.format(total)}</tspan>
                                                <tspan x={viewBox?.cx} dy="1.7em" className={styles.totalLabel}>Total de citas</tspan>
                                            </text>
                                        )}
                                    />
                                </Pie>
                                <Tooltip content={<StateTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <ul className={styles.legend} aria-label="Detalle de citas por estado">
                        {distribution.map((item, index) => (
                            <li key={`${item.estado}-${index}`}>
                                <span className={`${styles.swatch} ${styles[`color${index % colors.length}`]}`} aria-hidden="true" />
                                <span className={styles.stateName}>{formatState(item.estado)}</span>
                                <strong>{numberFormatter.format(item.cantidad)}</strong>
                                <span>{percentageFormatter.format(item.porcentaje)}%</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className={styles.empty}>No hay citas por estado en el período seleccionado.</p>
            )}
        </article>
    );
}
