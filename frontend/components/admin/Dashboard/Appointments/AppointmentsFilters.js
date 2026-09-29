import DashboardPeriodFilters from "../DashboardPeriodFilters/DashboardPeriodFilters";

export default function AppointmentsFilters({
    filters,
    onYearChange,
    onMonthChange,
    loading = false,
}) {
    return (
        <DashboardPeriodFilters
            filters={filters}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
            moduleName="citas"
            idPrefix="appointments"
            loading={loading}
        />
    );
}
