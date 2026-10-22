export function buildFindDoctorsParams({
    search = "",
    especialidad = "",
    departamento = "",
    ciudad = "",
    calificacionMinima = "",
} = {}) {
    const params = {};

    if (search) params.search = search;
    if (especialidad) params.especialidad = especialidad;
    if (departamento) params.departamento = departamento;
    if (ciudad) params.ciudad = ciudad;

    const rating = Number(calificacionMinima);
    if (calificacionMinima !== "" && Number.isFinite(rating) && rating >= 1 && rating <= 5) {
        params.calificacion_minima = rating;
    }

    return params;
}

export function hasFindDoctorsFilters(filtros) {
    return Object.keys(buildFindDoctorsParams(filtros)).length > 0;
}
