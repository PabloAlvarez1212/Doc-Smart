"use client";

import {
    Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./AppointmentsStats/AppointmentStats.module.css";
import { getIntegerAxis } from "./appointmentDemandChartLayout";

const dayLabels = {
    lunes: "Lun",
    martes: "Mar",
    miércoles: "Mié",
    miercoles: "Mié",
    jueves: "Jue",
    viernes: "Vie",
    sábado: "Sáb",
    sabado: "Sáb",
    domingo: "Dom",
};

function formatDay(value) {
    const normalized = String(value ?? "").trim().toLocaleLowerCase("es-CO");
    return dayLabels[normalized] ?? String(value).slice(0, 3);
}

export default function AppointmentsByWeekdayChart({ data }) {
    const { axisMax, ticks } = getIntegerAxis(data, "total_citas");

    return (
        <div className={styles.chartArea} aria-label="Citas programadas por día de la semana">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barCategoryGap="30%" margin={{ top: 24, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke="#e9eef4" strokeDasharray="3 4" />
                    <XAxis
                        dataKey="dia"
                        tickFormatter={formatDay}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        interval={0}
                    />
                    <YAxis
                        allowDecimals={false}
                        domain={[0, axisMax]}
                        ticks={ticks}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                    />
                    <Tooltip
                        formatter={(value) => [value, "Citas programadas"]}
                        contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                    />
                    <Bar dataKey="total_citas" name="Citas programadas" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={40}>
                        <LabelList dataKey="total_citas" position="top" fill="#526078" fontSize={11} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
