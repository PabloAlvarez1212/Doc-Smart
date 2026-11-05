"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { MONTHS_ES, PERIOD_TYPES } from "../dashboardPeriodFilters";
import styles from "./FiltrosDashboard.module.css";

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 6 }, (_, index) => currentYear - index);

const periodOptions = [
    { value: PERIOD_TYPES.YEAR, label: "Año completo" },
    { value: PERIOD_TYPES.MONTH, label: "Mes" },
    { value: PERIOD_TYPES.CUSTOM, label: "Personalizado" },
];

export default function FiltrosDashboard({
    filtros,
    errores,
    updating = false,
    onChange,
    onApply,
    onReset,
}) {
    const handleSubmit = (event) => {
        event.preventDefault();
        onApply();
    };

    return (
        <section className={styles.panel} aria-labelledby="dashboard-filters-title">
            <h2 id="dashboard-filters-title" className={styles.srOnly}>Período de análisis</h2>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.periods} role="group" aria-label="Tipo de período">
                    {periodOptions.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            className={filtros.tipo_periodo === value ? styles.on : undefined}
                            aria-pressed={filtros.tipo_periodo === value}
                            disabled={updating}
                            onClick={() => onChange("tipo_periodo", value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className={styles.fields}>
                    {filtros.tipo_periodo === PERIOD_TYPES.MONTH && (
                        <div className={styles.field}>
                            <label htmlFor="dashboard-mes">Mes</label>
                            <select
                                id="dashboard-mes"
                                name="mes"
                                value={filtros.mes}
                                onChange={(event) => onChange(event.target.name, event.target.value)}
                                aria-invalid={Boolean(errores.mes)}
                                disabled={updating}
                            >
                                {MONTHS_ES.map((month, index) => (
                                    <option key={month} value={index + 1}>{month}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {filtros.tipo_periodo !== PERIOD_TYPES.CUSTOM && (
                        <div className={styles.field}>
                            <label htmlFor="dashboard-anio">Año</label>
                            <select
                                id="dashboard-anio"
                                name="anio"
                                value={filtros.anio}
                                onChange={(event) => onChange(event.target.name, event.target.value)}
                                aria-invalid={Boolean(errores.anio)}
                                disabled={updating}
                            >
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {filtros.tipo_periodo === PERIOD_TYPES.CUSTOM && (
                        <>
                            <div className={styles.field}>
                                <label htmlFor="dashboard-fecha-inicio">Fecha inicial</label>
                                <input
                                    id="dashboard-fecha-inicio"
                                    name="fecha_inicio"
                                    type="date"
                                    value={filtros.fecha_inicio}
                                    onChange={(event) => onChange(event.target.name, event.target.value)}
                                    aria-invalid={Boolean(errores.fecha_inicio)}
                                    aria-describedby={errores.fecha_inicio ? "dashboard-fecha-inicio-error" : undefined}
                                    disabled={updating}
                                />
                                {errores.fecha_inicio && (
                                    <p id="dashboard-fecha-inicio-error" className={styles.error}>{errores.fecha_inicio}</p>
                                )}
                            </div>
                            <div className={styles.field}>
                                <label htmlFor="dashboard-fecha-fin">Fecha final</label>
                                <input
                                    id="dashboard-fecha-fin"
                                    name="fecha_fin"
                                    type="date"
                                    value={filtros.fecha_fin}
                                    onChange={(event) => onChange(event.target.name, event.target.value)}
                                    aria-invalid={Boolean(errores.fecha_fin)}
                                    aria-describedby={errores.fecha_fin ? "dashboard-fecha-fin-error" : undefined}
                                    disabled={updating}
                                />
                                {errores.fecha_fin && (
                                    <p id="dashboard-fecha-fin-error" className={styles.error}>{errores.fecha_fin}</p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.actions}>
                    <button className={styles.primaryAction} type="submit" disabled={updating}>
                        <SlidersHorizontal size={17} aria-hidden="true" />
                        Aplicar
                    </button>
                    <button className={styles.secondaryAction} type="button" onClick={onReset} disabled={updating}>
                        <RotateCcw size={16} aria-hidden="true" />
                        Restablecer
                    </button>
                </div>
            </form>

            {updating && (
                <p className={styles.updating} role="status" aria-live="polite">
                    Actualizando estadísticas…
                </p>
            )}
        </section>
    );
}
