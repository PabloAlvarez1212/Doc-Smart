export const DASHBOARD_SECTIONS = ["resumen", "citas", "medicos", "pacientes"];

export function validDashboardSections(sections) {
    if (!Array.isArray(sections)) return [];
    return [...new Set(sections.filter((section) => DASHBOARD_SECTIONS.includes(section)))];
}

export function sectionsAfterConnection(version, connectedBefore) {
    return version > 0 && connectedBefore ? DASHBOARD_SECTIONS : [];
}

export function splitDashboardRefresh(sections, manualPending) {
    const ready = [];
    const deferred = [];
    validDashboardSections(sections).forEach((section) => {
        (manualPending.has(section) ? deferred : ready).push(section);
    });
    return { ready, deferred };
}
