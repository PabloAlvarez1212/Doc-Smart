const SUPPORTED_STATES = new Set([
    "pendiente",
    "rechazado",
    "sin_solicitud",
]);

export function buildNonApprovedSpecialtyData(data) {
    const specialties = new Map();

    for (const item of Array.isArray(data) ? data : []) {
        const specialty = String(item?.especialidad ?? "").trim();
        const state = String(item?.estado ?? "").trim().toLowerCase();

        if (!specialty || !SUPPORTED_STATES.has(state)) continue;

        if (!specialties.has(specialty)) {
            specialties.set(specialty, {
                especialidad: specialty,
                pendiente: 0,
                rechazado: 0,
                sin_solicitud: 0,
            });
        }

        const total = Number(item?.total_medicos);
        specialties.get(specialty)[state] += Number.isFinite(total)
            ? Math.max(0, total)
            : 0;
    }

    return Array.from(specialties.values());
}
