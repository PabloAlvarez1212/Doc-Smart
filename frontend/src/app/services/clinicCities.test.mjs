import test from 'node:test';
import assert from 'node:assert/strict';
import { loadClinicCities } from './clinicCities.mjs';

test('loads every page of the real catalog response with city/department database IDs', async () => {
    const calls = [];
    const result = await loadClinicCities(async (url, { params }) => {
        calls.push({ url, ...params });
        const page = params.page;
        return { data: { ok: true, data: {
            resultados: [{ id_ciudad: page, nombre_ciudad: `Ciudad ${page}`, id_departamento: 20, nombre_departamento: 'Antioquia' }],
            paginacion: { count: 3, total_pages: 3, current_page: page, page_size: 200 },
        } } };
    });
    assert.deepEqual(result.map(c => c.id_ciudad), [1, 2, 3]);
    assert.ok(result.every(c => c.nombre_departamento === 'Antioquia'));
    assert.deepEqual(calls.map(c => c.page), [1, 2, 3]);
    assert.ok(calls.every(c => c.url === '/catalogos/ciudades/' && c.page_size === 200));
});

test('does not expose a partial catalog when a later page fails, and can retry', async () => {
    let fail = true;
    const request = async (_, { params: { page } }) => {
        if (page === 2 && fail) throw new Error('Network error');
        return { data: { data: { resultados: [{ id_ciudad: page }], paginacion: { total_pages: 2, current_page: page } } } };
    };
    await assert.rejects(loadClinicCities(request), /Network error/);
    fail = false;
    assert.equal((await loadClinicCities(request)).length, 2);
});

test('accepts the legacy list and rejects malformed or repeated pages', async () => {
    assert.deepEqual(await loadClinicCities(async () => ({ data: { data: [] } })), []);
    await assert.rejects(loadClinicCities(async () => ({ data: { data: {} } })), /inválida/);
    await assert.rejects(loadClinicCities(async () => ({ data: { data: { resultados: [], paginacion: { total_pages: 2, current_page: 1 } } } })), /inválida/);
});
