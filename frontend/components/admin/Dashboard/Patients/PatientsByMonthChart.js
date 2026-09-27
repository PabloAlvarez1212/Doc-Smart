"use client";

import {
    CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
    formatDashboardMonthLong,
    formatDashboardMonthShort,
} from "../dashboardMonthFormatters";
import styles from "./PatientStats/PatientStats.module.css";

function MonthTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const total = Math.max(0, Number(payload[0]?.value) || 0);

    return (
        <div className={styles.chartTooltip}>
            <strong>{formatDashboardMonthLong(label)}</strong>
            <span>{total} {total === 1 ? "paciente registrado" : "pacientes registrados"}</span>
        </div>
    );
}

export default function PatientsByMonthChart({ data }) {
    const monthlyRegistrations = data.map((item) => ({
        ...item,
        total_pacientes: Math.max(0, Number(item.total_pacientes) || 0),
    }));
    const hasSingleMonth = monthlyRegistrations.length === 1;

    return (
        <div
            className={`${styles.chartArea} ${styles.trendChart}`}
            role="img"
            aria-label="Evolución mensual de pacientes registrados"
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={monthlyRegistrations}
                    margin={{ top: hasSingleMonth ? 28 : 14, right: 16, left: -12, bottom: 4 }}
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
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip content={<MonthTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="total_pacientes"
                        name="Pacientes registrados"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: hasSingleMonth ? 5 : 3.5, fill: "#fff", stroke: "#2563eb", strokeWidth: 2.5 }}
                        activeDot={{ r: 5.5, fill: "#fff", strokeWidth: 2.5 }}
                        connectNulls={false}
                    >
                        {hasSingleMonth && (
                            <LabelList
                                dataKey="total_pacientes"
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
