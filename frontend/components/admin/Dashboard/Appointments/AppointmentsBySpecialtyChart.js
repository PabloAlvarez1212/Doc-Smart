"use client";

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";
import { getSpecialtyChartLayout, SpecialtyTick } from "../specialtyChartLayout";

export default function AppointmentsBySpecialtyChart({ data }) {
    const { axisWidth, chartHeight, axisMax, ticks } = getSpecialtyChartLayout(data, "total_citas");

    return (
        <div className={styles.specialtyScroll} aria-label="Citas por especialidad">
            <div className={styles.specialtyArea} style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        barCategoryGap="30%"
                        margin={{ top: 8, right: 12, left: 8, bottom: 2 }}
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
