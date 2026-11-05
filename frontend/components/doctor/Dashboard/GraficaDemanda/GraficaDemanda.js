"use client";

import { useMemo } from "react";
import styles from "./GraficaDemanda.module.css";

const DAYS = [
    { numero: 1, corto: "Lun", largo: "Lunes" },
    { numero: 2, corto: "Mar", largo: "Martes" },
    { numero: 3, corto: "Mié", largo: "Miércoles" },
    { numero: 4, corto: "Jue", largo: "Jueves" },
    { numero: 5, corto: "Vie", largo: "Viernes" },
    { numero: 6, corto: "Sáb", largo: "Sábado" },
    { numero: 7, corto: "Dom", largo: "Domingo" },
];

const MIN_RANGE = [7, 18];

const formatHour = (hour) => `${hour % 12 || 12} ${hour < 12 ? "a. m." : "p. m."}`;

// Mapa de calor: cada celda es un día de la semana a una hora; más intenso significa más citas programadas.
export default function GraficaDemanda({ data = [] }) {
    const { hours, cells, max, total, peak } = useMemo(() => {
        const grid = new Map();
        let highest = 0;
        let sum = 0;
        let top = null;

        data.forEach((item) => {
            const day = Number(item.dia_numero);
            const hour = Number(item.hora);
            const count = Math.max(0, Number(item.cantidad) || 0);
            if (!Number.isInteger(day) || !Number.isInteger(hour) || count <= 0) return;
            grid.set(`${day}-${hour}`, count);
            sum += count;
            if (count > highest) {
                highest = count;
                top = { day, hour, count };
            }
        });

        const activeHours = [...grid.keys()].map((key) => Number(key.split("-")[1]));
        const first = Math.min(MIN_RANGE[0], ...(activeHours.length ? activeHours : [MIN_RANGE[0]]));
        const last = Math.max(MIN_RANGE[1], ...(activeHours.length ? activeHours : [MIN_RANGE[1]]));

        return {
            hours: Array.from({ length: last - first + 1 }, (_, index) => first + index),
            cells: grid,
            max: highest,
            total: sum,
            peak: top,
        };
    }, [data]);

    const peakDay = peak ? DAYS.find((day) => day.numero === peak.day)?.largo : null;

    return (
        <article className={`${styles.card} ${styles.wide}`}>
            <header className={styles.header}>
                <h2>Demanda por horario</h2>
                <p>Citas programadas según el día de la semana y la hora de atención.</p>
            </header>

            {total > 0 ? (
                <>
                    <div className={styles.scroll}>
                        <table className={styles.heatmap}>
                            <caption className={styles.srOnly}>
                                Citas programadas por día y hora. {peak ? `El horario más ocupado es ${peakDay} a las ${formatHour(peak.hour)}, con ${peak.count} citas.` : ""}
                            </caption>
                            <thead>
                                <tr>
                                    <td aria-hidden="true" />
                                    {DAYS.map((day) => (
                                        <th key={day.numero} scope="col" abbr={day.largo}>{day.corto}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {hours.map((hour, row) => (
                                    <tr key={hour}>
                                        <th scope="row">{formatHour(hour)}</th>
                                        {DAYS.map((day, column) => {
                                            const count = cells.get(`${day.numero}-${hour}`) ?? 0;
                                            const level = count > 0 ? .2 + (count / max) * .8 : 0;
                                            const strong = level >= .6;
                                            const isPeak = peak && peak.day === day.numero && peak.hour === hour;
                                            return (
                                                <td
                                                    key={day.numero}
                                                    className={`${styles.cell} ${count > 0 ? styles.active : ""} ${strong ? styles.strong : ""} ${isPeak ? styles.peak : ""}`}
                                                    style={{ "--level": level, "--delay": `${(row + column) * 14}ms` }}
                                                    title={`${day.largo}, ${formatHour(hour)}: ${count} ${count === 1 ? "cita" : "citas"}`}
                                                >
                                                    {count > 0 ? count : <span className={styles.srOnly}>0</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <footer className={styles.footer}>
                        {peak && <p><strong>Más ocupado:</strong> {peakDay}, {formatHour(peak.hour)} ({peak.count} {peak.count === 1 ? "cita" : "citas"})</p>}
                        <div className={styles.scale} aria-hidden="true">
                            <span>Menos</span>
                            <i />
                            <span>Más</span>
                        </div>
                    </footer>
                </>
            ) : (
                <p className={styles.empty}>No hay citas programadas por horario en el período seleccionado.</p>
            )}
        </article>
    );
}
