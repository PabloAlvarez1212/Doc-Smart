"use client";

import {
    Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./PatientStats/PatientStats.module.css";

function formatAgeRange(value) {
    const range = String(value ?? "");
    return range.endsWith("+") ? `${range} años` : `${range.replace("-", " – ")} años`;
}

function AgeTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const total = Math.max(0, Number(payload[0]?.value) || 0);

    return (
        <div className={styles.chartTooltip}>
            <strong>{formatAgeRange(label)}</strong>
            <span>{total} {total === 1 ? "paciente" : "pacientes"}</span>
        </div>
    );
}

export default function PatientsByAgeChart({ data }) {
    const ageDistribution = data.map((item) => ({
        ...item,
        rango: String(item.rango ?? "Sin rango"),
        total_pacientes: Math.max(0, Number(item.total_pacientes) || 0),
    }));
    const maxPatients = Math.max(0, ...ageDistribution.map((item) => item.total_pacientes));
    const axisMax = maxPatients <= 4
        ? Math.max(2, maxPatients + 1)
        : Math.ceil(maxPatients * 1.18);

    return (
        <div
            className={`${styles.chartArea} ${styles.demographicChart}`}
            role="img"
            aria-label="Distribución de pacientes por rango de edad"
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={ageDistribution}
                    barCategoryGap="30%"
                    margin={{ top: 28, right: 10, left: -12, bottom: 4 }}
                >
                    <CartesianGrid vertical={false} stroke="#e9eef4" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="rango"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        interval={0}
                    />
                    <YAxis
                        allowDecimals={false}
                        domain={[0, axisMax]}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip cursor={{ fill: "#f5f8fb" }} content={<AgeTooltip />} />
                    <Bar
                        dataKey="total_pacientes"
                        name="Total de pacientes"
                        fill="#13796f"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={42}
                    >
                        <LabelList
                            dataKey="total_pacientes"
                            position="top"
                            fill="#334155"
                            fontSize={11}
                            fontWeight={700}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
