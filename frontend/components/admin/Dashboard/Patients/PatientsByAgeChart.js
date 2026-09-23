"use client";

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./PatientStats/PatientStats.module.css";

export default function PatientsByAgeChart({ data }) {
    return (
        <div className={styles.chartArea} aria-label="Distribución de pacientes por rango de edad">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barCategoryGap="34%" margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
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
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip
                        formatter={(value) => [value, "Total de pacientes"]}
                        labelFormatter={(label) => `Rango ${label} años`}
                        contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                    />
                    <Bar dataKey="total_pacientes" name="Total de pacientes" fill="#13796f" radius={[5, 5, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
