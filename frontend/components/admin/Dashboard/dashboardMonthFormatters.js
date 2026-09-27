const SHORT_MONTH_NAMES = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const LONG_MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function parseDashboardMonth(value) {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})(?:$|[-T])/);

    if (!match) return null;

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;

    if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) {
        return null;
    }

    return { year, monthIndex };
}

export function formatDashboardMonthShort(value) {
    const month = parseDashboardMonth(value);
    return month
        ? `${SHORT_MONTH_NAMES[month.monthIndex]} ${month.year}`
        : "Mes no disponible";
}

export function formatDashboardMonthLong(value) {
    const month = parseDashboardMonth(value);
    return month
        ? `${LONG_MONTH_NAMES[month.monthIndex]} ${month.year}`
        : "Mes no disponible";
}
