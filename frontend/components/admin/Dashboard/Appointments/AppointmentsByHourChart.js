"use client";

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";
import { getIntegerAxis } from "./appointmentDemandChartLayout";

function formatHour(value) {
    return String(value ?? "").slice(0, 5);
}

export default function AppointmentsByHourChart({ data }) {
    const { axisMax, ticks } = getIntegerAxis(data, "total_citas");
    const chartMinWidth = data.length > 8 ? data.length * 52 : "100%";

    return (
        <div className={styles.chartScroller} role="region" aria-label="Citas programadas por hora" tabIndex={data.length > 8 ? 0 : undefined}>
            <div className={styles.hourChartArea} style={{ minWidth: chartMinWidth }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barCategoryGap="28%" margin={{ top: 14, right: 12, left: -12, bottom: 4 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                        <XAxis
                            dataKey="hora"
                            tickFormatter={formatHour}
                            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            interval={0}
                        />
                        <YAxis
                            allowDecimals={false}
                            domain={[0, axisMax]}
                            ticks={ticks}
                            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={42}
                        />
                        <Tooltip
                            labelFormatter={(value) => `${formatHour(value)} h`}
                            formatter={(value) => [value, "Citas programadas"]}
                            contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                        />
                        <Bar dataKey="total_citas" name="Citas programadas" fill="#13796f" radius={[5, 5, 0, 0]} maxBarSize={34} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
