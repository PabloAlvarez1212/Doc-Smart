export function normalizeResumenCalificaciones(value) {
    const promedio = Number(value?.promedio);
    const total = Number(value?.total_calificaciones);
    const distribucion = Object.fromEntries(
        [5, 4, 3, 2, 1].map((puntuacion) => {
            const cantidad = Number(value?.distribucion?.[puntuacion]);
            return [String(puntuacion), Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 0];
        })
    );

    return {
        promedio: Number.isFinite(promedio) ? Math.min(5, Math.max(0, promedio)) : 0,
        totalCalificaciones: Number.isInteger(total) && total > 0 ? total : 0,
        distribucion,
    };
}

export function normalizeCalificacionesResponse(value) {
    const collection = Array.isArray(value) ? value : value?.data;
    return Array.isArray(collection) ? collection : [];
}

export function formatPromedioCalificaciones(value) {
    const promedio = Number(value);
    return (Number.isFinite(promedio) ? Math.min(5, Math.max(0, promedio)) : 0).toFixed(1);
}

export function buildDistribucionCalificaciones(distribucion, totalCalificaciones) {
    const total = Number(totalCalificaciones);
    const totalSeguro = Number.isInteger(total) && total > 0 ? total : 0;
    return [5, 4, 3, 2, 1].map((puntuacion) => {
        const rawCantidad = Number(distribucion?.[puntuacion]);
        const cantidad = Number.isInteger(rawCantidad) && rawCantidad > 0 ? rawCantidad : 0;
        return {
            puntuacion,
            cantidad,
            porcentaje: totalSeguro ? Math.min(100, Math.round((cantidad / totalSeguro) * 100)) : 0,
        };
    });
}
