export const PERIOD_TYPES = Object.freeze({
    YEAR: "year",
    MONTH: "month",
    CUSTOM: "custom",
});

export const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const crearFiltrosIniciales = (currentYear = new Date().getFullYear()) => ({
    tipo_periodo: PERIOD_TYPES.YEAR,
    anio: String(currentYear),
    mes: "1",
    fecha_inicio: "",
    fecha_fin: "",
});

const validarFechaISO = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    return candidate.getUTCFullYear() === year
        && candidate.getUTCMonth() === month - 1
        && candidate.getUTCDate() === day;
};

const formatDate = (year, month, day) => [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
].join("-");

export const obtenerRangoPeriodo = (filters) => {
    const errors = {};
    const year = Number(filters.anio);

    if (!Number.isInteger(year) || year < 1 || year > 9999) {
        errors.anio = "Selecciona un año válido.";
    }

    if (filters.tipo_periodo === PERIOD_TYPES.YEAR) {
        return errors.anio
            ? { fecha_inicio: "", fecha_fin: "", errores: errors }
            : { fecha_inicio: formatDate(year, 1, 1), fecha_fin: formatDate(year, 12, 31), errores: {} };
    }

    if (filters.tipo_periodo === PERIOD_TYPES.MONTH) {
        const month = Number(filters.mes);
        if (!Number.isInteger(month) || month < 1 || month > 12) {
            errors.mes = "Selecciona un mes válido.";
        }
        if (Object.keys(errors).length > 0) {
            return { fecha_inicio: "", fecha_fin: "", errores: errors };
        }
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return {
            fecha_inicio: formatDate(year, month, 1),
            fecha_fin: formatDate(year, month, lastDay),
            errores: {},
        };
    }

    if (filters.tipo_periodo !== PERIOD_TYPES.CUSTOM) {
        return {
            fecha_inicio: "",
            fecha_fin: "",
            errores: { tipo_periodo: "Selecciona un tipo de período válido." },
        };
    }

    if (!filters.fecha_inicio) errors.fecha_inicio = "La fecha inicial es obligatoria.";
    else if (!validarFechaISO(filters.fecha_inicio)) errors.fecha_inicio = "Ingresa una fecha inicial válida.";

    if (!filters.fecha_fin) errors.fecha_fin = "La fecha final es obligatoria.";
    else if (!validarFechaISO(filters.fecha_fin)) errors.fecha_fin = "Ingresa una fecha final válida.";

    if (!errors.fecha_inicio && !errors.fecha_fin && filters.fecha_inicio > filters.fecha_fin) {
        errors.fecha_fin = "La fecha inicial no puede ser posterior a la fecha final.";
    }

    return { fecha_inicio: filters.fecha_inicio, fecha_fin: filters.fecha_fin, errores: errors };
};
