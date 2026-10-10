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
    formatDashboardDayLong,
    formatDashboardDayShort,
    formatDashboardMonthLong,
    formatDashboardMonthShort,
} from "../dashboardMonthFormatters";
import styles from "./AppointmentsStats/AppointmentStats.module.css";

export default function AppointmentsCreatedByPeriodChart({ data, grouping }) {
    const isDaily = grouping === "dia";
    const hasSinglePeriod = data.length === 1;
    const activity = data.map((item) => ({
        periodo: String(item?.periodo ?? ""),
        total: Math.max(0, Number(item?.total) || 0),
    }));
    const maxAppointments = Math.max(0, ...activity.map((item) => item.total));
    const axisMax = maxAppointments <= 4
        ? Math.max(2, maxAppointments + 1)
        : Math.ceil(maxAppointments * 1.15);
    const formatPeriodShort = isDaily
        ? formatDashboardDayShort
        : formatDashboardMonthShort;
    const formatPeriodLong = isDaily
        ? formatDashboardDayLong
        : formatDashboardMonthLong;

    return (
        <div
            className={styles.chartArea}
            role="img"
            aria-label={`Citas creadas por ${isDaily ? "día" : "mes"}`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={activity}
                    margin={{ top: hasSinglePeriod ? 28 : 12, right: 14, left: -16, bottom: 4 }}
                >
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="periodo"
                        tickFormatter={formatPeriodShort}
                        tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={22}
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
                    <Tooltip
                        labelFormatter={formatPeriodLong}
                        formatter={(value) => [value, "Citas creadas"]}
                        contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="total"
                        name="Citas creadas"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: hasSinglePeriod ? 5 : 3, fill: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                    >
                        {hasSinglePeriod && (
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
