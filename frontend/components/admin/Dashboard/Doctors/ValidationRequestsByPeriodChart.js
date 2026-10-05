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
import styles from "./DoctorStats/DoctorStats.module.css";

export default function ValidationRequestsByPeriodChart({ data, grouping }) {
    const isDaily = grouping === "dia";
    const hasSinglePeriod = data.length === 1;
    const requests = data.map((item) => ({
        periodo: String(item?.periodo ?? ""),
        total_solicitudes: Math.max(0, Number(item?.total_solicitudes) || 0),
    }));
    const maxRequests = Math.max(0, ...requests.map((item) => item.total_solicitudes));
    const axisMax = maxRequests <= 4
        ? Math.max(2, maxRequests + 1)
        : Math.ceil(maxRequests * 1.15);
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
            aria-label={`Solicitudes de validación por ${isDaily ? "día" : "mes"}`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={requests}
                    margin={{ top: hasSinglePeriod ? 28 : 12, right: 14, left: -16, bottom: 4 }}
                >
                    <CartesianGrid vertical={false} stroke="#e9eef4" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="periodo"
                        tickFormatter={formatPeriodShort}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={22}
                        tickMargin={10}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        allowDecimals={false}
                        domain={[0, axisMax]}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip
                        labelFormatter={formatPeriodLong}
                        formatter={(value) => [value, "Solicitudes recibidas"]}
                        contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="total_solicitudes"
                        name="Solicitudes recibidas"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: hasSinglePeriod ? 5 : 3, fill: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                    >
                        {hasSinglePeriod && (
                            <LabelList
                                dataKey="total_solicitudes"
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
