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
import styles from "./PatientStats/PatientStats.module.css";

const CHART_CONFIG = {
    registered: {
        color: "#2563eb",
        singular: "paciente registrado",
        plural: "pacientes registrados",
    },
    active: {
        color: "#13796f",
        singular: "paciente activo",
        plural: "pacientes activos",
    },
};

function PatientsPeriodTooltip({ active, payload, label, grouping, kind }) {
    if (!active || !payload?.length) return null;

    const total = Math.max(0, Number(payload[0]?.value) || 0);
    const config = CHART_CONFIG[kind] ?? CHART_CONFIG.registered;
    const formatPeriod = grouping === "dia"
        ? formatDashboardDayLong
        : formatDashboardMonthLong;

    return (
        <div className={styles.chartTooltip}>
            <strong>{formatPeriod(label)}</strong>
            <span>{total} {total === 1 ? config.singular : config.plural}</span>
        </div>
    );
}

export default function PatientsPeriodLineChart({ data, grouping, kind }) {
    const isDaily = grouping === "dia";
    const config = CHART_CONFIG[kind] ?? CHART_CONFIG.registered;
    const patients = data.map((item) => ({
        periodo: String(item?.periodo ?? ""),
        total_pacientes: Math.max(0, Number(item?.total_pacientes) || 0),
    }));
    const hasSinglePeriod = patients.length === 1;
    const maxPatients = Math.max(0, ...patients.map((item) => item.total_pacientes));
    const axisMax = maxPatients <= 4
        ? Math.max(2, maxPatients + 1)
        : Math.ceil(maxPatients * 1.15);
    const formatPeriodShort = isDaily
        ? formatDashboardDayShort
        : formatDashboardMonthShort;

    return (
        <div
            className={`${styles.chartArea} ${styles.trendChart}`}
            role="img"
            aria-label={`${kind === "active" ? "Pacientes activos" : "Pacientes registrados"} por ${isDaily ? "día" : "mes"}`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={patients}
                    margin={{ top: hasSinglePeriod ? 30 : 16, right: 18, left: -12, bottom: 4 }}
                >
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="periodo"
                        tickFormatter={formatPeriodShort}
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
                    <Tooltip
                        content={(
                            <PatientsPeriodTooltip
                                grouping={grouping}
                                kind={kind}
                            />
                        )}
                    />
                    <Line
                        type="monotone"
                        dataKey="total_pacientes"
                        name={config.plural}
                        stroke={config.color}
                        strokeWidth={2.75}
                        dot={{
                            r: hasSinglePeriod ? 5.5 : 3.75,
                            fill: "#ffffff",
                            stroke: config.color,
                            strokeWidth: 2.5,
                        }}
                        activeDot={{
                            r: 5.75,
                            fill: "#ffffff",
                            stroke: config.color,
                            strokeWidth: 2.5,
                        }}
                        connectNulls={false}
                    >
                        {hasSinglePeriod && (
                            <LabelList
                                dataKey="total_pacientes"
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
