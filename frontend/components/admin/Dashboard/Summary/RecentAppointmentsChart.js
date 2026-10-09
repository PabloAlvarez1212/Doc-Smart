"use client";

import {
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    formatDashboardMonthLong,
    formatDashboardMonthShort,
} from "../dashboardMonthFormatters";
import styles from "./DashboardSummary.module.css";

function RecentActivityTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const total = Math.max(0, Number(payload[0]?.value) || 0);

    return (
        <div className={styles.chartTooltip}>
            <strong>{formatDashboardMonthLong(label)}</strong>
            <span>{total} {total === 1 ? "cita creada" : "citas creadas"}</span>
        </div>
    );
}

export default function RecentAppointmentsChart({ data }) {
    const activity = data.map((item) => ({
        mes: String(item?.mes ?? ""),
        total: Math.max(0, Number(item?.total) || 0),
    }));
    const hasSingleMonth = activity.length === 1;
    const maxAppointments = Math.max(0, ...activity.map((item) => item.total));
    const axisMax = maxAppointments <= 4
        ? Math.max(2, maxAppointments + 1)
        : Math.ceil(maxAppointments * 1.15);

    return (
        <div
            className={styles.chartArea}
            role="img"
            aria-label="Citas creadas durante los últimos meses disponibles"
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={activity}
                    margin={{ top: hasSingleMonth ? 30 : 16, right: 18, left: -12, bottom: 4 }}
                >
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="mes"
                        tickFormatter={formatDashboardMonthShort}
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                        tickMargin={10}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        allowDecimals={false}
                        domain={[0, axisMax]}
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip content={<RecentActivityTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="total"
                        name="Citas creadas"
                        stroke="#2563eb"
                        strokeWidth={2.75}
                        dot={{
                            r: hasSingleMonth ? 5.5 : 3.75,
                            fill: "#fff",
                            stroke: "#2563eb",
                            strokeWidth: 2.5,
                        }}
                        activeDot={{
                            r: 5.75,
                            fill: "#fff",
                            stroke: "#2563eb",
                            strokeWidth: 2.5,
                        }}
                        connectNulls={false}
                    >
                        {hasSingleMonth && (
                            <LabelList
                                dataKey="total"
                                position="top"
                                fill="var(--text-secondary)"
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
