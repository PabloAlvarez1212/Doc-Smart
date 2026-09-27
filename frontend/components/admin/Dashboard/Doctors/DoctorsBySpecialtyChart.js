"use client";

import {
    Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./DoctorStats/DoctorStats.module.css";
import { SpecialtyTick, wrapSpecialtyLabel } from "../specialtyChartLayout";

function getDoctorsSpecialtyLayout(data) {
    const wrappedLabels = data.map((item) => wrapSpecialtyLabel(item.especialidad));
    const longestLine = Math.max(1, ...wrappedLabels.flat().map((line) => line.length));
    const maxLines = Math.max(1, ...wrappedLabels.map((lines) => lines.length));
    const axisWidth = Math.min(124, Math.max(76, longestLine * 6.6 + 14));
    const rowHeight = Math.max(42, maxLines * 14 + 16);
    const chartHeight = Math.max(118, data.length * rowHeight + 54);
    const maxTotal = Math.max(1, ...data.map((item) => {
        const value = Number(item.total_medicos);
        return Number.isFinite(value) ? value : 0;
    }));
    const targetMax = Math.max(2, Math.ceil(maxTotal * 1.2));
    const tickStep = Math.max(1, Math.ceil(targetMax / 4));
    const axisMax = Math.ceil(targetMax / tickStep) * tickStep;
    const ticks = Array.from(
        { length: Math.floor(axisMax / tickStep) + 1 },
        (_, index) => index * tickStep
    );

    return { axisWidth, chartHeight, axisMax, ticks };
}

function SpecialtyTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload;
    const total = Number(item.total_medicos) || 0;

    return (
        <div className={styles.specialtyTooltip}>
            <strong>{item.especialidad}</strong>
            <span>{total} {total === 1 ? "médico aprobado" : "médicos aprobados"}</span>
        </div>
    );
}

export default function DoctorsBySpecialtyChart({ data }) {
    const { axisWidth, chartHeight, axisMax, ticks } = getDoctorsSpecialtyLayout(data);

    return (
        <div className={styles.specialtyChart} role="img" aria-label="Médicos aprobados por especialidad">
            <div className={styles.specialtyArea} style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        barCategoryGap="30%"
                        margin={{ top: 6, right: 34, left: 4, bottom: 2 }}
                    >
                        <CartesianGrid horizontal={false} stroke="#e9eef4" strokeDasharray="3 4" />
                        <XAxis
                            type="number"
                            allowDecimals={false}
                            domain={[0, axisMax]}
                            ticks={ticks}
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="especialidad"
                            width={axisWidth}
                            interval={0}
                            tick={<SpecialtyTick />}
                            tickMargin={6}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<SpecialtyTooltip />} />
                        <Bar
                            dataKey="total_medicos"
                            name="Médicos aprobados"
                            fill="#2563eb"
                            radius={[0, 6, 6, 0]}
                            maxBarSize={22}
                        >
                            <LabelList
                                dataKey="total_medicos"
                                position="right"
                                fill="#334155"
                                fontSize={11}
                                fontWeight={750}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
