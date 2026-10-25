import test from 'node:test';
import assert from 'node:assert/strict';
import { cityViewport } from './cityViewport.mjs';

const city = { id: 1, nombre: 'Riohacha', departamento: 'La Guajira' };
const result = {
    types: ['locality', 'political'],
    address_components: [
        { types: ['locality'], long_name: 'Riohacha' },
        { types: ['administrative_area_level_1'], long_name: 'La Guajira' },
        { types: ['country'], long_name: 'Colombia', short_name: 'CO' },
    ],
    geometry: { viewport: { toJSON: () => ({ north: 11.6, south: 11.5, west: -72.95, east: -72.85 }) } },
};
test('fits the full city viewport and includes the precise saved marker', () => {
    assert.deepEqual(cityViewport([result], city, { lat: 11.55, lng: -72.9 }), { north: 11.6, south: 11.5, west: -72.95, east: -72.85 });
    assert.equal(cityViewport([result], city, { lat: 11.61, lng: -72.9 }).north, 11.61);
});
test('rejects another city, a street viewport and invalid bounds instead of showing the country', () => {
    assert.throws(() => cityViewport([result], { ...city, nombre: 'Bello' }, { lat: 11.55, lng: -72.9 }));
    assert.throws(() => cityViewport([{ ...result, types: ['street_address'] }], city, { lat: 11.55, lng: -72.9 }));
    assert.throws(() => cityViewport([{ ...result, geometry: { viewport: { north: 99 } } }], city, { lat: 11.55, lng: -72.9 }));
});
