"use client";

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";
import { getSpecialtyChartLayout, SpecialtyTick } from "../specialtyChartLayout";
import { getSpecialtyChartMinWidth } from "../specialtyChartSizing";

const CHART_VARIANTS = {
    created: {
        ariaLabel: "Citas creadas por especialidad",
        seriesLabel: "Citas creadas",
        color: "#2563eb",
    },
    scheduled: {
        ariaLabel: "Citas programadas por especialidad",
        seriesLabel: "Citas programadas",
        color: "#13796f",
    },
};

export default function AppointmentsBySpecialtyChart({ data, variant = "scheduled" }) {
    const chartVariant = CHART_VARIANTS[variant] ?? CHART_VARIANTS.scheduled;
    const { axisWidth, chartHeight, axisMax, ticks } = getSpecialtyChartLayout(data, "total_citas");
    const chartMinWidth = getSpecialtyChartMinWidth(axisWidth);

    return (
        <div
            className={styles.specialtyScroll}
            role="region"
            tabIndex={0}
            aria-label={chartVariant.ariaLabel}
        >
            <div
                className={styles.specialtyArea}
                style={{ height: chartHeight, minWidth: chartMinWidth }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        barCategoryGap="30%"
                        margin={{ top: 8, right: 12, left: 8, bottom: 2 }}
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
                        <Tooltip
                            formatter={(value) => [value, chartVariant.seriesLabel]}
                            contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                        />
                        <Bar
                            dataKey="total_citas"
                            name={chartVariant.seriesLabel}
                            fill={chartVariant.color}
                            radius={[0, 5, 5, 0]}
                            maxBarSize={25}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
