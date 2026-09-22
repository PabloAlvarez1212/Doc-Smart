"use client";

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";

function wrapSpecialtyLabel(value) {
    const lines = [];
    let currentLine = "";

    for (let word of String(value ?? "").trim().split(/\s+/)) {
        while (word.length > 23) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = "";
            }
            lines.push(word.slice(0, 23));
            word = word.slice(23);
        }
        if (!word) continue;
        if (currentLine && `${currentLine} ${word}`.length > 23) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
    }

    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [""];
}

function SpecialtyTick({ x, y, payload }) {
    const lines = wrapSpecialtyLabel(payload.value);

    return (
        <text x={x} y={y} textAnchor="end" fill="#526078" fontSize="12">
            {lines.map((line, index) => (
                <tspan key={index} x={x} dy={index === 0 ? 4 - (lines.length - 1) * 7 : 14}>
                    {line}
                </tspan>
            ))}
        </text>
    );
}

export default function AppointmentsBySpecialtyChart({ data }) {
    const maxLines = Math.max(1, ...data.map((item) => wrapSpecialtyLabel(item.especialidad).length));
    const rowHeight = Math.max(54, maxLines * 15 + 18);
    const chartHeight = Math.max(280, data.length * rowHeight + 48);

    return (
        <div className={styles.specialtyScroll} aria-label="Citas por especialidad">
            <div className={styles.specialtyArea} style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        barCategoryGap="34%"
                        margin={{ top: 8, right: 20, left: 4, bottom: 2 }}
                    >
                        <CartesianGrid horizontal={false} stroke="#e9eef4" strokeDasharray="3 4" />
                        <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="especialidad"
                            width={190}
                            interval={0}
                            tick={<SpecialtyTick />}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            formatter={(value) => [value, "Total de citas"]}
                            contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                        />
                        <Bar dataKey="total_citas" name="Total de citas" fill="#13796f" radius={[0, 5, 5, 0]} maxBarSize={25} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
