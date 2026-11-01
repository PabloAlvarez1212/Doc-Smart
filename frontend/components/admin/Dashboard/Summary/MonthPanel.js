import DotsMeter from "./DotsMeter";
import MeterBar from "./MeterBar";
import StarsMeter from "./StarsMeter";
import {
    buildActivePatients,
    buildCancellationsRow,
    buildRating,
    buildSpecialtyRow,
    formatCount,
    monthName,
} from "./summaryRegistryData";
import styles from "./DashboardSummary.module.css";

const MAX_DOTS = 12;

function MonthRow({ label, value, context, loading, children }) {
    const isEmpty = value === "—";

    return (
        <div className={styles.monthRow}>
            <dt className={styles.monthLabel}>{label}</dt>
            {loading ? (
                <>
                    <dd className={styles.monthValue}>
                        <span className={styles.skeleton} aria-hidden="true" />
                    </dd>
                    <dd className={styles.monthContext}>
                        <span className={`${styles.skeleton} ${styles.skeletonWide}`} aria-hidden="true" />
                    </dd>
                </>
            ) : (
                <>
                    <dd className={`${styles.monthValue} ${isEmpty ? styles.monthEmpty : ""}`}>{value}</dd>
                    {context && <dd className={styles.monthContext}>{context}</dd>}
                    {children && <dd className={styles.monthMeter}>{children}</dd>}
                </>
            )}
        </div>
    );
}

export default function MonthPanel({ metrics, loading }) {
    const hasMetrics = Boolean(metrics);
    const cancellations = buildCancellationsRow(metrics?.tasa_cancelacion_mes);
    const activePatients = buildActivePatients(metrics);
    const rating = buildRating(metrics?.calificacion_promedio_mes);
    const requestedSpecialty = buildSpecialtyRow(metrics?.especialidad_mas_solicitada_mes, "creada");
    const scheduledSpecialty = buildSpecialtyRow(metrics?.especialidad_mas_programada_mes, "programada");
    const count = (value) => (hasMetrics ? formatCount(value) : "—");
    const activeLabel = `${activePatients.active} de ${activePatients.total} pacientes activos`;

    return (
        <section className={`${styles.panel} ${styles.monthPanel}`} aria-labelledby="resumen-este-mes">
            <h3 id="resumen-este-mes" className={styles.panelTitle}>Este mes · {monthName()}</h3>
            <p className={styles.panelSubtitle}>Lo que va del mes y cómo se está cumpliendo.</p>

            <dl className={styles.monthList}>
                <MonthRow
                    label="Citas programadas"
                    value={count(metrics?.tasa_cancelacion_mes?.base)}
                    loading={loading}
                />
                <MonthRow
                    label="Canceladas"
                    value={cancellations.value}
                    context={cancellations.context}
                    loading={loading}
                >
                    {cancellations.base > 0 && (
                        <MeterBar
                            value={cancellations.canceled}
                            total={cancellations.base}
                            tone="red"
                            label={`${cancellations.canceled} de ${cancellations.base} citas canceladas`}
                        />
                    )}
                </MonthRow>
                <MonthRow
                    label="Canceladas durante el mes"
                    value={count(metrics?.cancelaciones_mes)}
                    context="Sin importar la fecha de la cita"
                    loading={loading}
                />
                <MonthRow label="Pacientes activos" value={activePatients.value} loading={loading}>
                    {activePatients.total > 0 && (
                        activePatients.total <= MAX_DOTS ? (
                            <DotsMeter
                                active={activePatients.active}
                                total={activePatients.total}
                                label={activeLabel}
                            />
                        ) : (
                            <MeterBar
                                value={activePatients.active}
                                total={activePatients.total}
                                tone="blue"
                                label={activeLabel}
                            />
                        )
                    )}
                </MonthRow>
                <MonthRow
                    label="Calificación promedio"
                    value={rating.value}
                    context={rating.context}
                    loading={loading}
                >
                    {hasMetrics && <StarsMeter average={rating.average} />}
                </MonthRow>
                <MonthRow
                    label="Especialidad más solicitada"
                    value={requestedSpecialty.value}
                    context={requestedSpecialty.context}
                    loading={loading}
                />
                <MonthRow
                    label="Especialidad más programada"
                    value={scheduledSpecialty.value}
                    context={scheduledSpecialty.context}
                    loading={loading}
                />
            </dl>
        </section>
    );
}
