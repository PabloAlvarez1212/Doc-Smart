"use client";

import {
    Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./PatientStats/PatientStats.module.css";

function tickLines(value) {
    const label = String(value ?? "");
    const match = label.match(/^(.*?)(?:\s+citas?)$/i);

    if (!match) return [label];

    return [match[1], label.toLocaleLowerCase("es-CO").endsWith("cita") ? "cita" : "citas"];
}

function AppointmentRangeTick({ x, y, payload }) {
    const lines = tickLines(payload?.value);

    return (
        <text x={x} y={y} textAnchor="middle" fill="var(--text-secondary)" fontSize="11">
            {lines.map((line, index) => (
                <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? 13 : 14}>
                    {line}
                </tspan>
            ))}
        </text>
    );
}

function CountLabel({ x, y, width, value }) {
    const total = Math.max(0, Number(value) || 0);

    if (![x, y, width].every(Number.isFinite)) return null;

    return (
        <text
            x={x + width / 2}
            y={Math.max(12, y - 7)}
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize="11"
            fontWeight="700"
        >
            {total}
        </text>
    );
}

function AppointmentCountTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const total = Math.max(0, Number(payload[0]?.value) || 0);

    return (
        <div className={styles.chartTooltip}>
            <strong>{String(label ?? "Rango sin nombre")}</strong>
            <span>{total} {total === 1 ? "paciente" : "pacientes"}</span>
        </div>
    );
}

export default function PatientsByAppointmentCountChart({ data }) {
    const distribution = data.map((item) => ({
        ...item,
        rango: String(item.rango ?? "Sin rango"),
        total_pacientes: Math.max(0, Number(item.total_pacientes) || 0),
    }));
    const maxPatients = Math.max(0, ...distribution.map((item) => item.total_pacientes));
    const axisMax = maxPatients <= 4
        ? Math.max(2, maxPatients + 1)
        : Math.ceil(maxPatients * 1.18);

    return (
        <div
            className={`${styles.chartArea} ${styles.frequencyChart}`}
            role="img"
            aria-label="Distribución de pacientes por cantidad de citas registradas"
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={distribution}
                    barCategoryGap="38%"
                    margin={{ top: 28, right: 10, left: -12, bottom: 16 }}
                >
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="rango"
                        interval={0}
                        height={46}
                        tick={<AppointmentRangeTick />}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        allowDecimals={false}
                        domain={[0, axisMax]}
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip
                        cursor={{ fill: "#f5f8fb" }}
                        content={<AppointmentCountTooltip />}
                    />
                    <Bar
                        dataKey="total_pacientes"
                        name="Pacientes"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                    >
                        <LabelList dataKey="total_pacientes" content={<CountLabel />} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
