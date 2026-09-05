import { RotateCcw, Search } from "lucide-react";
import Button from "../../../ui/Button/Button";
import styles from "./MedicalHistoryFilters.module.css";

export default function MedicalHistoryFilters({ filters, doctors, onChange, onReset }) {
    const hasFilters = Object.values(filters).some((value) => value !== "" && value !== "all");
    return (
        <section className={styles.filters} aria-label="Filtros del historial clínico">
            <label className={styles.search}>
                <span className={styles.visuallyHidden}>Buscar en el historial</span><Search size={20} aria-hidden="true" />
                <input type="search" value={filters.search} placeholder="Buscar por médico, diagnóstico o motivo" onChange={(event) => onChange("search", event.target.value)} />
            </label>
            <label className={styles.field}>
                <span>Periodo</span>
                <select value={filters.period} onChange={(event) => onChange("period", event.target.value)}>
                    <option value="all">Todos</option><option value="3months">Últimos 3 meses</option><option value="6months">Últimos 6 meses</option><option value="year">Este año</option>
                </select>
            </label>
            <label className={styles.field}>
                <span>Profesional</span>
                <select value={filters.doctor} onChange={(event) => onChange("doctor", event.target.value)}>
                    <option value="all">Todos los médicos</option>
                    {doctors.map((doctor) => <option key={doctor} value={doctor}>{doctor}</option>)}
                </select>
            </label>
            <Button className={styles.reset} variant="secundary" onClick={onReset} disabled={!hasFilters}><RotateCcw size={17} aria-hidden="true" /> Limpiar</Button>
        </section>
    );
}
