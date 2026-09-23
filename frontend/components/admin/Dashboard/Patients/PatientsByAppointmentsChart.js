"use client";

import {
    Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import styles from "./PatientStats/PatientStats.module.css";
import { getPatientsChartLayout, PatientNameTick } from "./patientChartLayout";

export default function PatientsByAppointmentsChart({ data }) {
    const { axisWidth, chartHeight, axisMax, ticks } = getPatientsChartLayout(data);

    return (
        <div className={styles.patientsChartArea} style={{ height: chartHeight }} aria-label="Pacientes con más citas">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    barCategoryGap="30%"
                    margin={{ top: 8, right: 12, left: 8, bottom: 2 }}
                >
                    <CartesianGrid horizontal={false} stroke="#e9eef4" strokeDasharray="3 4" />
                    <XAxis
                        type="number"
                        allowDecimals={false}
                        domain={[0, axisMax]}
                        ticks={ticks}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="paciente"
                        width={axisWidth}
                        interval={0}
                        tick={<PatientNameTick />}
                        tickMargin={6}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        formatter={(value) => [value, "Total de citas"]}
                        contentStyle={{ borderRadius: 10, borderColor: "#e1e7f0", fontSize: 13 }}
                    />
                    <Bar dataKey="total_citas" name="Total de citas" fill="#2563eb" radius={[0, 5, 5, 0]} maxBarSize={25} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
