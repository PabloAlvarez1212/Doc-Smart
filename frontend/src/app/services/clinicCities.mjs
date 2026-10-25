// Keep the catalog's database IDs: profile updates use these, not API Colombia IDs.
export async function loadClinicCities(request) {
    const cities = [];
    let page = 1;
    let totalPages = 1;
    do {
        const response = await request('/catalogos/ciudades/', {
            params: { page, page_size: 200 },
        });
        const data = response?.data?.data;
        // Department-scoped endpoints and older deployments return an array.
        if (page === 1 && Array.isArray(data)) return data;
        if (!Array.isArray(data?.resultados) ||
            !Number.isInteger(data?.paginacion?.total_pages) ||
            data.paginacion.total_pages < 1 ||
            data.paginacion.current_page !== page) {
            throw new Error('Respuesta inválida del catálogo de ciudades.');
        }
        cities.push(...data.resultados);
        totalPages = data.paginacion.total_pages;
        page += 1;
    } while (page <= totalPages);
    return cities;
}
