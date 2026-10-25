"use client";

import { useReducedMotion } from "motion/react";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import styles from "./GraficaAsistencia.module.css";

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const percentageFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

function AttendanceTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;

    return (
        <div className={styles.tooltip}>
            <strong>{item.estado}</strong>
            <span>{numberFormatter.format(item.cantidad)} citas</span>
            <span>{percentageFormatter.format(item.porcentaje)}% del total</span>
        </div>
    );
}

export default function GraficaAsistencia({ data = [] }) {
    const reduced = useReducedMotion();
    const chartData = data.map((item) => ({
        ...item,
        cantidad: Math.max(0, Number(item.cantidad) || 0),
        porcentaje: Math.max(0, Number(item.porcentaje) || 0),
    }));
    const hasActivity = chartData.some((item) => item.cantidad > 0);

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <h2>Asistencia a consultas</h2>
                <p>Compara consultas completadas e inasistencias registradas durante el período.</p>
            </header>

            {hasActivity ? (
                <div className={styles.chartArea} role="img" aria-label="Comparación de asistencia a consultas">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 4 }}>
                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                            <XAxis
                                dataKey="estado"
                                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                width={42}
                            />
                            <Tooltip cursor={{ fill: "var(--surface-muted)" }} content={<AttendanceTooltip />} />
                            <Bar isAnimationActive={!reduced} animationDuration={240} dataKey="cantidad" name="Citas" fill="var(--doctor-chart-0)" radius={[7, 7, 2, 2]} maxBarSize={72} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className={styles.empty}>No hay datos de asistencia en el período seleccionado.</p>
            )}
        </article>
    );
}
