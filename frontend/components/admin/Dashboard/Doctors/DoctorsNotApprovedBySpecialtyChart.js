"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { SpecialtyTick, wrapSpecialtyLabel } from "../specialtyChartLayout";
import { getSpecialtyChartMinWidth } from "../specialtyChartSizing";
import { buildNonApprovedSpecialtyData } from "./doctorSpecialtyData";
import styles from "./DoctorStats/DoctorStats.module.css";

const STATUS_SERIES = [
    { key: "pendiente", label: "Pendiente", color: "#a8640b" },
    { key: "rechazado", label: "Rechazado", color: "#b42335" },
    { key: "sin_solicitud", label: "Sin solicitud", color: "var(--text-secondary)" },
];

function getChartLayout(data) {
    const wrappedLabels = data.map((item) => wrapSpecialtyLabel(item.especialidad));
    const longestLine = Math.max(1, ...wrappedLabels.flat().map((line) => line.length));
    const maxLines = Math.max(1, ...wrappedLabels.map((lines) => lines.length));
    const axisWidth = Math.min(132, Math.max(76, longestLine * 6.6 + 16));
    const rowHeight = Math.max(48, maxLines * 14 + 18);
    const chartHeight = Math.max(190, data.length * rowHeight + 82);
    const maxTotal = Math.max(1, ...data.map((item) => (
        item.pendiente + item.rechazado + item.sin_solicitud
    )));
    const targetMax = Math.max(2, Math.ceil(maxTotal * 1.15));
    const tickStep = Math.max(1, Math.ceil(targetMax / 4));
    const axisMax = Math.ceil(targetMax / tickStep) * tickStep;
    const ticks = Array.from(
        { length: Math.floor(axisMax / tickStep) + 1 },
        (_, index) => index * tickStep
    );

    return { axisWidth, chartHeight, axisMax, ticks };
}

function NonApprovedTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;

    const specialty = payload[0].payload;

    return (
        <div className={styles.specialtyTooltip}>
            <strong>{specialty.especialidad}</strong>
            {STATUS_SERIES.map((status) => (
                <span key={status.key}>
                    {status.label}: {specialty[status.key]}
                </span>
            ))}
        </div>
    );
}

export default function DoctorsNotApprovedBySpecialtyChart({ data }) {
    const chartData = buildNonApprovedSpecialtyData(data);
    const { axisWidth, chartHeight, axisMax, ticks } = getChartLayout(chartData);
    const chartMinWidth = getSpecialtyChartMinWidth(axisWidth);

    return (
        <div
            className={styles.specialtyChart}
            role="region"
            tabIndex={0}
            aria-label="Médicos no aprobados por especialidad y estado de validación"
        >
            <div
                className={styles.specialtyArea}
                style={{ height: chartHeight, minWidth: chartMinWidth }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        barCategoryGap="28%"
                        margin={{ top: 6, right: 18, left: 4, bottom: 12 }}
                    >
                        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
                        <XAxis
                            type="number"
                            allowDecimals={false}
                            domain={[0, axisMax]}
                            ticks={ticks}
                            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
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
                        <Tooltip content={<NonApprovedTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }}
                        />
                        {STATUS_SERIES.map((status, index) => (
                            <Bar
                                key={status.key}
                                dataKey={status.key}
                                name={status.label}
                                stackId="validation-status"
                                fill={status.color}
                                maxBarSize={24}
                                radius={index === STATUS_SERIES.length - 1 ? [0, 5, 5, 0] : 0}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
