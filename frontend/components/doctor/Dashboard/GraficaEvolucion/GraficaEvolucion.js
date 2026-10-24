"use client";

import { useReducedMotion } from "motion/react";

import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import styles from "./GraficaEvolucion.module.css";

const monthNames = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
];

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

const formatPeriod = (value, grouping) => {
    const [year, month, day] = String(value ?? "").split("-").map(Number);
    if (!year || !month) return String(value ?? "");

    if (grouping === "mes" || !day) {
        return `${monthNames[month - 1] ?? month} ${year}`;
    }

    const label = `${day} ${monthNames[month - 1] ?? month}`;
    return grouping === "semana" ? `Sem. ${label}` : label;
};

const getIntegerAxis = (data) => {
    const maximum = Math.max(
        0,
        ...data.flatMap((item) => [Number(item.programadas) || 0, Number(item.completadas) || 0]),
    );
    const axisMax = Math.max(1, maximum);
    const step = Math.max(1, Math.ceil(axisMax / 4));
    const roundedMax = Math.ceil(axisMax / step) * step;
    return Array.from({ length: Math.floor(roundedMax / step) + 1 }, (_, index) => index * step);
};

export default function GraficaEvolucion({ data = [], agrupacion = "mes" }) {
    const reduced = useReducedMotion();
    const hasActivity = data.some(
        (item) => (Number(item.programadas) || 0) > 0 || (Number(item.completadas) || 0) > 0,
    );
    const ticks = getIntegerAxis(data);

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <div>
                    <h2>Evolución de citas</h2>
                    <p>Compara citas programadas y consultas completadas durante el período.</p>
                </div>
                <span>{agrupacion === "dia" ? "Por día" : agrupacion === "semana" ? "Por semana" : "Por mes"}</span>
            </header>

            {hasActivity ? (
                <div className={styles.chartArea} role="img" aria-label="Evolución de citas programadas y completadas">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                            <XAxis
                                dataKey="periodo"
                                tickFormatter={(value) => formatPeriod(value, agrupacion)}
                                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                minTickGap={18}
                            />
                            <YAxis
                                allowDecimals={false}
                                ticks={ticks}
                                domain={[0, ticks[ticks.length - 1]]}
                                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                width={42}
                            />
                            <Tooltip
                                labelFormatter={(value) => formatPeriod(value, agrupacion)}
                                formatter={(value, name) => [numberFormatter.format(Number(value) || 0), name]}
                                contentStyle={{ borderRadius: 10, borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--color-text)", fontSize: 12 }} labelStyle={{ color: "var(--color-text)" }}
                            />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
                            />
                            <Line isAnimationActive={!reduced} animationDuration={240}
                                type="monotone"
                                dataKey="programadas"
                                name="Programadas"
                                stroke="var(--doctor-chart-1)"
                                strokeWidth={2.4}
                                dot={{ r: 3, strokeWidth: 2, fill: "var(--surface)" }}
                                activeDot={{ r: 5 }}
                            />
                            <Line isAnimationActive={!reduced} animationDuration={240}
                                type="monotone"
                                dataKey="completadas"
                                name="Completadas"
                                stroke="var(--doctor-chart-0)"
                                strokeWidth={2.4}
                                dot={{ r: 3, strokeWidth: 2, fill: "var(--surface)" }}
                                activeDot={{ r: 5 }}
                            />
                            <Line isAnimationActive={!reduced} animationDuration={240}
                                type="monotone"
                                dataKey="canceladas"
                                name="Canceladas"
                                stroke="var(--ink-red)"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className={styles.empty}>No hay citas registradas en el período seleccionado.</p>
            )}
        </article>
    );
}
