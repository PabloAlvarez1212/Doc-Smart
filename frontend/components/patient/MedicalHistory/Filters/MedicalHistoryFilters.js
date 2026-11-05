import FilterBar from "../../../ui/FilterBar/FilterBar";

const PERIODS = [
    { value: "3months", label: "Últimos 3 meses" },
    { value: "6months", label: "Últimos 6 meses" },
    { value: "year", label: "Este año" },
];
const ORDERINGS = [
    { value: "fecha_creacion", label: "Más antiguos" },
    { value: "-version_actual", label: "Mayor versión" },
    { value: "version_actual", label: "Menor versión" },
];

export default function MedicalHistoryFilters({ filters, professionals, onChange, onReset }) {
    return (
        <FilterBar
            searchValue={filters.search}
            onSearch={(value) => onChange("search", value)}
            searchLabel="Buscar en el historial"
            placeholder="Buscar por médico, código, diagnóstico o motivo"
            onClear={onReset}
            filters={[
                { key: "period", label: "Periodo", value: filters.period === "all" ? "" : filters.period, options: PERIODS, allLabel: "Todo el historial", onChange: (value) => onChange("period", value || "all") },
                { key: "doctor", label: "Profesional", value: filters.doctor === "all" ? "" : filters.doctor, options: professionals.map((professional) => ({ value: professional.nombre, label: professional.nombre })), allLabel: "Todos los médicos", onChange: (value) => onChange("doctor", value || "all") },
                { key: "ordering", label: "Orden", value: filters.ordering === "-fecha_creacion" ? "" : filters.ordering, options: ORDERINGS, allLabel: "Más recientes", onChange: (value) => onChange("ordering", value || "-fecha_creacion") },
            ]}
        />
    );
}
