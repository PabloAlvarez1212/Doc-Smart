"use client";

import {
    Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";
import { getIntegerAxis } from "./appointmentDemandChartLayout";

export default function CancellationsByResponsibleChart({ data }) {
    const { axisMax, ticks } = getIntegerAxis(data, "total");

    return (
        <div className={styles.chartArea} aria-label="Cancelaciones por responsable">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barCategoryGap="30%" margin={{ top: 24, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="responsable"
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
                        formatter={(value) => [value, "Citas canceladas"]}
                        contentStyle={{ borderRadius: 10, borderColor: "var(--border)", fontSize: 13 }}
                    />
                    <Bar dataKey="total" name="Citas canceladas" fill="#b42335" radius={[5, 5, 0, 0]} maxBarSize={48}>
                        <LabelList dataKey="total" position="top" fill="var(--text-secondary)" fontSize={11} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
