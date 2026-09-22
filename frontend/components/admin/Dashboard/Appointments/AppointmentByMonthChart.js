"use client";

import {
    CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";

function formatMonth(value, options) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleDateString("es-CO", { ...options, timeZone: "America/Bogota" });
}

export default function AppointmentsByMonthChart({ data }) {
    return (
        <div className={styles.chartArea} aria-label="Citas solicitadas por mes de creación">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 12, right: 14, left: -16, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke="#e9eef4" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="mes"
                        tickFormatter={(value) => formatMonth(value, { month: "short", year: "2-digit" })}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={22}
                        tickMargin={10}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip
                        labelFormatter={(value) => formatMonth(value, { month: "long", year: "numeric" })}
                        formatter={(value) => [value, "Total de citas"]}
                        contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="total_citas"
                        name="Total de citas"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
