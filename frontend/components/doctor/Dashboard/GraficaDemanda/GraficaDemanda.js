"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import styles from "./GraficaDemanda.module.css";

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

const formatDay = (value) => dayLabels[String(value ?? "").toLocaleLowerCase("es-CO")] ?? value;

export default function GraficaDemanda({ data = [] }) {
    const chartData = data.map((item) => ({
        ...item,
        cantidad: Math.max(0, Number(item.cantidad) || 0),
    }));
    const hasActivity = data.some((item) => (Number(item.cantidad) || 0) > 0);

    return (
        <article className={styles.card}>
            <header className={styles.header}>
                <h2>Demanda por día de la semana</h2>
                <p>Distribución de citas programadas según el día en que será la atención.</p>
            </header>

            {hasActivity ? (
                <div className={styles.chartScroll}>
                    <div className={styles.chartArea} role="img" aria-label="Citas programadas por día de la semana">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 4 }}>
                                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                                <XAxis
                                    dataKey="dia"
                                    tickFormatter={formatDay}
                                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                    interval={0}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={42}
                                />
                                <Tooltip
                                    labelFormatter={(value) => value}
                                    formatter={(value) => [Number(value) || 0, "Citas programadas"]}
                                    cursor={{ fill: "var(--surface-muted)" }}
                                    contentStyle={{ borderRadius: 10, borderColor: "var(--border)", fontSize: 12 }}
                                />
                                <Bar dataKey="cantidad" name="Citas programadas" fill="#2563eb" radius={[7, 7, 2, 2]} maxBarSize={48} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <p className={styles.empty}>No hay citas programadas por día en el período seleccionado.</p>
            )}
        </article>
    );
}
