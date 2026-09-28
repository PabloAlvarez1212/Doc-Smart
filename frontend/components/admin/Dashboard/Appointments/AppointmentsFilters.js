"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import styles from "./AppointmentsStats/AppointmentStats.module.css";

const MONTH_OPTIONS = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
];

export default function AppointmentsFilters({
    filters,
    onYearChange,
    onMonthChange,
    loading = false,
}) {
    const availableYears = Array.isArray(filters?.anios_disponibles)
        ? filters.anios_disponibles
        : [];
    const selectedYear = filters?.anio ?? "";
    const selectedMonth = filters?.mes ?? "";

    return (
        <section className={styles.filtersPanel} aria-labelledby="appointment-filters-title">
            <div className={styles.filtersHeading}>
                <span className={styles.filtersIcon} aria-hidden="true">
                    <CalendarRange size={18} strokeWidth={1.9} />
                </span>
                <div>
                    <h3 id="appointment-filters-title">Período de análisis</h3>
                    <p>Selecciona el período que quieres analizar.</p>
                </div>
            </div>

            <div className={styles.filterControls}>
                <label className={styles.filterField}>
                    <span>Año</span>
                    <span className={styles.selectWrapper}>
                        <select
                            value={selectedYear}
                            onChange={(event) => onYearChange(event.target.value)}
                            disabled={loading || !availableYears.length}
                            aria-label="Seleccionar año de las estadísticas de citas"
                        >
                            {!availableYears.length && <option value="">Sin años disponibles</option>}
                            {availableYears.map((year) => (
                                <option value={year} key={year}>{year}</option>
                            ))}
                        </select>
                        <ChevronDown size={15} aria-hidden="true" />
                    </span>
                </label>

                <label className={styles.filterField}>
                    <span>Mes</span>
                    <span className={styles.selectWrapper}>
                        <select
                            value={selectedMonth}
                            onChange={(event) => onMonthChange(event.target.value)}
                            disabled={loading || !selectedYear}
                            aria-label="Seleccionar mes de las estadísticas de citas"
                        >
                            <option value="">Todos</option>
                            {MONTH_OPTIONS.map((month) => (
                                <option value={month.value} key={month.value}>{month.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={15} aria-hidden="true" />
                    </span>
                </label>
            </div>
        </section>
    );
}
