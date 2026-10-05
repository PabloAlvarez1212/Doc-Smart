const VALID_KINDS = new Set(["creada", "programada"]);

export function buildSpecialtyMetric(metric, kind) {
    const especialidad = String(metric?.especialidad ?? "").trim();
    const total = Number(metric?.total_citas);

    if (
        !especialidad
        || !Number.isFinite(total)
        || total <= 0
        || !VALID_KINDS.has(kind)
    ) {
        return null;
    }

    const isSingular = total === 1;

    return {
        especialidad,
        total,
        textoTotal: `${total} ${isSingular ? "cita" : "citas"} ${isSingular ? kind : `${kind}s`}`,
    };
}
