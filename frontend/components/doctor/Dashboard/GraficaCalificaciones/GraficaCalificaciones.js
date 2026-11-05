"use client";

import { useReducedMotion } from "motion/react";

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import styles from "../GraficaEvolucion/GraficaEvolucion.module.css";

const monthNames = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
];

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const ratingFormatter = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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
    const maximum = Math.max(0, ...data.map((item) => Number(item.cantidad) || 0));
    const axisMax = Math.max(1, maximum);
    const step = Math.max(1, Math.ceil(axisMax / 4));
    const roundedMax = Math.ceil(axisMax / step) * step;
    return Array.from({ length: Math.floor(roundedMax / step) + 1 }, (_, index) => index * step);
};

function RatingTooltip({ active, payload, label, grouping }) {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    const average = Number(item.promedio);

    return (
        <div style={{ padding: "9px 11px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", color: "var(--text-secondary)", fontSize: 12, display: "grid", gap: 3 }}>
            <strong style={{ color: "var(--color-text)" }}>{formatPeriod(label, grouping)}</strong>
            <span>{numberFormatter.format(Number(item.cantidad) || 0)} {Number(item.cantidad) === 1 ? "calificación" : "calificaciones"}</span>
            {Number.isFinite(average) && item.promedio !== null && <span>Promedio {ratingFormatter.format(average)} de 5</span>}
        </div>
    );
}

// Evolución de cuántos pacientes calificaron al médico en cada período; se actualiza sola por WebSocket.
export default function GraficaCalificaciones({ data = [], agrupacion = "mes" }) {
    const reduced = useReducedMotion();
    const total = data.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0);
    const ticks = getIntegerAxis(data);

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <div>
                    <h2>Evolución de calificaciones</h2>
                    <p>Cuántos pacientes calificaron tu perfil durante el período. Se actualiza en tiempo real.</p>
                </div>
                <span>{agrupacion === "dia" ? "Por día" : agrupacion === "semana" ? "Por semana" : "Por mes"}</span>
            </header>

            {total > 0 ? (
                <div className={styles.chartArea} role="img" aria-label={`Evolución de calificaciones recibidas, ${total} en total`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
                            <defs>
                                <linearGradient id="relleno-calificaciones" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" style={{ stopColor: "var(--dash-star, #d98a00)", stopOpacity: 0.45 }} />
                                    <stop offset="100%" style={{ stopColor: "var(--dash-star, #d98a00)", stopOpacity: 0.03 }} />
                                </linearGradient>
                            </defs>
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
                            <Tooltip content={<RatingTooltip grouping={agrupacion} />} />
                            <Area
                                isAnimationActive={!reduced}
                                animationDuration={500}
                                type="monotone"
                                dataKey="cantidad"
                                name="Calificaciones"
                                stroke="var(--dash-star, #d98a00)"
                                strokeWidth={2.4}
                                fill="url(#relleno-calificaciones)"
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 2, fill: "var(--surface)", stroke: "var(--dash-star, #d98a00)" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className={styles.empty}>Todavía no hay calificaciones en el período seleccionado.</p>
            )}
        </article>
    );
}
