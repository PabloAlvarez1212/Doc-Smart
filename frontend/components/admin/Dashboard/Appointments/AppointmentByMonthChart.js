"use client";

import {
    CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
    formatDashboardMonthLong,
    formatDashboardMonthShort,
} from "../dashboardMonthFormatters";
import styles from "./AppointmentsStats/AppointmentStats.module.css";

export default function AppointmentsByMonthChart({ data }) {
    const hasSingleMonth = data.length === 1;

    return (
        <div className={styles.chartArea} aria-label="Citas solicitadas por mes de creación">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: hasSingleMonth ? 28 : 12, right: 14, left: -16, bottom: 4 }}
                >
                    <CartesianGrid vertical={false} stroke="#e9eef4" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="mes"
                        tickFormatter={formatDashboardMonthShort}
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
                        labelFormatter={formatDashboardMonthLong}
                        formatter={(value) => [value, "Total de citas"]}
                        contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="total_citas"
                        name="Total de citas"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: hasSingleMonth ? 5 : 3, fill: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                    >
                        {hasSingleMonth && (
                            <LabelList
                                dataKey="total_citas"
                                position="top"
                                fill="#334155"
                                fontSize={11}
                                fontWeight={700}
                            />
                        )}
                    </Line>
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
