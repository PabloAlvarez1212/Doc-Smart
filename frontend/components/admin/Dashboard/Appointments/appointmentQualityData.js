const responsibleLabels = {
    paciente: "Paciente",
    medico: "Médico",
    administrador: "Administrador",
    sistema: "Sistema",
    sin_dato: "Sin dato",
};

const percentageFormatter = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

export function formatResponsible(value) {
    return responsibleLabels[value] ?? responsibleLabels.sin_dato;
}

export function formatRate(rate, base) {
    if (!Number(base) || rate === null || rate === undefined) return "Sin citas";
    return `${percentageFormatter.format(rate)}%`;
}

export function formatCountOfBase(count, base) {
    const total = Number(base) || 0;
    return `${Number(count) || 0} de ${total} ${total === 1 ? "cita" : "citas"}`;
}

export function buildResponsibleData(items) {
    if (!Array.isArray(items)) return [];

    return items
        .map((item) => ({
            responsable: formatResponsible(item?.responsable),
            total: Number(item?.total) || 0,
        }))
        .filter((item) => item.total > 0);
}
