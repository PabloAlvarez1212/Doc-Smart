"use client";

import {
    CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./PatientStats/PatientStats.module.css";

const shortMonthNames = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
];

const longMonthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseMonth(value) {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;

    if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return null;

    return { year, monthIndex };
}

function formatMonth(value, format = "short") {
    const month = parseMonth(value);
    if (!month) return "Mes no disponible";

    const names = format === "long" ? longMonthNames : shortMonthNames;
    return `${names[month.monthIndex]} ${month.year}`;
}

function ActivePatientsTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const total = Math.max(0, Number(payload[0]?.value) || 0);

    return (
        <div className={styles.chartTooltip}>
            <strong>{formatMonth(label, "long")}</strong>
            <span>{total} {total === 1 ? "paciente activo" : "pacientes activos"}</span>
        </div>
    );
}

export default function ActivePatientsByMonthChart({ data }) {
    const activePatients = data.map((item) => ({
        ...item,
        mes: String(item.mes ?? ""),
        total_pacientes: Math.max(0, Number(item.total_pacientes) || 0),
    }));
    const hasSingleMonth = activePatients.length === 1;
    const maxPatients = Math.max(0, ...activePatients.map((item) => item.total_pacientes));
    const axisMax = maxPatients <= 4
        ? Math.max(2, maxPatients + 1)
        : Math.ceil(maxPatients * 1.15);

    return (
        <div
            className={`${styles.chartArea} ${styles.activeTrendChart}`}
            role="img"
            aria-label="Evolución mensual de pacientes únicos que generaron citas"
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={activePatients}
                    margin={{ top: hasSingleMonth ? 30 : 16, right: 18, left: -12, bottom: 4 }}
                >
                    <CartesianGrid vertical={false} stroke="#e9eef4" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="mes"
                        tickFormatter={(value) => formatMonth(value)}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
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
                    <Tooltip content={<ActivePatientsTooltip />} />
                    <Line
                        type="monotone"
                        dataKey="total_pacientes"
                        name="Pacientes activos"
                        stroke="#13796f"
                        strokeWidth={2.75}
                        dot={{
                            r: hasSingleMonth ? 5.5 : 3.75,
                            fill: "#ffffff",
                            stroke: "#13796f",
                            strokeWidth: 2.5,
                        }}
                        activeDot={{
                            r: 5.75,
                            fill: "#ffffff",
                            stroke: "#13796f",
                            strokeWidth: 2.5,
                        }}
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
