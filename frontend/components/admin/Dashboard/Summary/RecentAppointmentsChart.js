"use client";

import { useId } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
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

const BAR_COLOR = "var(--sum-blue)";
const BAR_RADIUS = 6;
const MIN_CURRENT_HEIGHT = 6;

function currentMonthKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

// Los formatters devuelven "Nov 2026" / "Noviembre 2026"; aquí solo se usa el nombre.
function monthWord(formatter, value) {
    return formatter(value).split(" ")[0].toLocaleLowerCase("es-CO");
}

function capitalize(text) {
    return text.charAt(0).toLocaleUpperCase("es-CO") + text.slice(1);
}

function RecentActivityTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;

    const { mes, total, enCurso } = payload[0].payload;

    return (
        <div className={styles.chartTooltip}>
            <strong>
                {capitalize(monthWord(formatDashboardMonthLong, mes))} · {total} {total === 1 ? "cita creada" : "citas creadas"}
            </strong>
            {enCurso && <span>mes en curso, aún incompleto</span>}
        </div>
    );
}

function MonthTick({ x, y, payload, currentMonth }) {
    const isCurrent = payload.value === currentMonth;

    return (
        <text x={x} y={y + 12} textAnchor="middle" fill="var(--text-secondary)" fontSize={12}>
            {monthWord(formatDashboardMonthShort, payload.value)}
            {isCurrent && (
                <tspan fill="var(--ink-orange)" fontSize={11} fontWeight={600}> · en curso</tspan>
            )}
        </text>
    );
}

// Barra con esquinas superiores redondeadas; el mes en curso va rayado y con borde punteado sin base.
function MonthBar({ x, y, width, height, payload, patternId }) {
    if (!(width > 0) || !(height > 0)) return null;

    const radius = Math.min(BAR_RADIUS, width / 2, height);
    const bottom = y + height;
    const right = x + width;
    const outline = `M${x} ${bottom}V${y + radius}Q${x} ${y} ${x + radius} ${y}H${right - radius}Q${right} ${y} ${right} ${y + radius}V${bottom}`;

    if (!payload.enCurso) {
        return <path d={`${outline}Z`} fill={BAR_COLOR} />;
    }

    return (
        <g>
            <path d={`${outline}Z`} fill={`url(#${patternId})`} />
            <path
                d={outline}
                fill="none"
                stroke={BAR_COLOR}
                strokeWidth={1.5}
                strokeDasharray="4 3"
            />
        </g>
    );
}

export default function RecentAppointmentsChart({ data }) {
    const patternId = `en-curso-${useId().replace(/:/g, "")}`;
    const thisMonth = currentMonthKey();
    const activity = (Array.isArray(data) ? data : []).map((item) => {
        const mes = String(item?.mes ?? "");

        return {
            mes,
            total: Math.max(0, Number(item?.total) || 0),
            enCurso: mes === thisMonth,
        };
    });

    if (!activity.length) {
        return <p className={styles.emptyState}>Aún no hay citas creadas en estos meses.</p>;
    }

    const maxAppointments = Math.max(...activity.map((item) => item.total));
    const ariaLabel = `Citas creadas: ${activity
        .map((item) => `${monthWord(formatDashboardMonthLong, item.mes)} ${item.total}${item.enCurso ? " (mes en curso)" : ""}`)
        .join(", ")}`;

    return (
        <div className={styles.chartArea} role="img" aria-label={ariaLabel}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={activity}
                    margin={{ top: 22, right: 8, left: 8, bottom: 4 }}
                    barCategoryGap="45%"
                >
                    <defs>
                        <pattern
                            id={patternId}
                            width="8"
                            height="8"
                            patternUnits="userSpaceOnUse"
                            patternTransform="rotate(45)"
                        >
                            <rect width="4" height="8" fill="var(--sum-blue-hatch)" />
                        </pattern>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="mes"
                        tick={<MonthTick currentMonth={thisMonth} />}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        interval={0}
                    />
                    <YAxis hide allowDecimals={false} domain={[0, Math.max(2, maxAppointments + 1)]} />
                    <Tooltip content={<RecentActivityTooltip />} cursor={{ fill: "var(--surface-muted)" }} />
                    <Bar
                        dataKey="total"
                        name="Citas creadas"
                        maxBarSize={72}
                        minPointSize={(_value, index) => (activity[index]?.enCurso ? MIN_CURRENT_HEIGHT : 0)}
                        shape={<MonthBar patternId={patternId} />}
                        isAnimationActive={false}
                    >
                        <LabelList
                            dataKey="total"
                            position="top"
                            fill="var(--color-text)"
                            fontSize={13}
                            fontWeight={700}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
