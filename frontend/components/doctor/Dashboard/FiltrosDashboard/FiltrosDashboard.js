"use client";

import { CalendarRange, RotateCcw, SlidersHorizontal } from "lucide-react";
import { MONTHS_ES, PERIOD_TYPES } from "../dashboardPeriodFilters";
import styles from "./FiltrosDashboard.module.css";

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 6 }, (_, index) => currentYear - index);

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
            <div className={styles.heading}>
                <span className={styles.headingIcon} aria-hidden="true">
                    <CalendarRange size={19} strokeWidth={1.9} />
                </span>
                <div>
                    <h2 id="dashboard-filters-title">Período de análisis</h2>
                    <p>Consulta tu actividad por año, mes o un rango personalizado.</p>
                </div>
            </div>

            <form className={`${styles.form} ${styles[filtros.tipo_periodo]}`} onSubmit={handleSubmit} noValidate>
                <div className={`${styles.field} ${styles.periodField}`}>
                    <label htmlFor="dashboard-tipo-periodo">Tipo de período</label>
                    <select
                        id="dashboard-tipo-periodo"
                        name="tipo_periodo"
                        value={filtros.tipo_periodo}
                        onChange={(event) => onChange(event.target.name, event.target.value)}
                        disabled={updating}
                    >
                        <option value={PERIOD_TYPES.YEAR}>Año completo</option>
                        <option value={PERIOD_TYPES.MONTH}>Mes específico</option>
                        <option value={PERIOD_TYPES.CUSTOM}>Personalizado</option>
                    </select>
                </div>

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
                            <option key={currentYear} value={currentYear}>{currentYear}</option>
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

                <div className={styles.actions}>
                    <button className={styles.primaryAction} type="submit" disabled={updating}>
                        <SlidersHorizontal size={17} aria-hidden="true" />
                        Aplicar filtros
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
