import test from 'node:test';
import assert from 'node:assert/strict';
import { geocodingErrorMessage, verifiedLocationAt } from './geocoding.mjs';
import { clinicAddress } from './addressLocation.mjs';

test('Google authorization failure is not presented as an invalid address or city', () => {
    const error = Object.assign(new Error('GEOCODER_GEOCODE: REQUEST_DENIED: The webpage is not allowed to use the geocoder.'), { code: 'REQUEST_DENIED' });
    assert.match(geocodingErrorMessage(error), /autorizada por Google/);
    assert.match(geocodingErrorMessage(error), /sugerencias/);
    assert.doesNotMatch(geocodingErrorMessage(error), /no corresponde|otro punto/);
});

test('quota, no-results, temporary errors and validation errors have distinct feedback', () => {
    assert.match(geocodingErrorMessage({ code: 'OVER_QUERY_LIMIT' }), /límite/);
    assert.match(geocodingErrorMessage({ code: 'ZERO_RESULTS' }), /dirección completa/);
    assert.match(geocodingErrorMessage(new Error('Network error')), /conectar/);
    let error;
    try { clinicAddress([], { id: 1, nombre: 'Medellín' }); } catch (e) { error = e; }
    assert.match(geocodingErrorMessage(error), /Colombia/);
});

const verified = { cityId: 1, direccion: 'Calle 51 #10-32', latitud: '11.5400000', longitud: '-72.9100000', verificada: true };
test('an exact point already verified in this session does not need another geocode', () => {
    assert.deepEqual(verifiedLocationAt(verified, { lat: 11.54, lng: -72.91 }, 1), {
        direccion: verified.direccion, latitud: verified.latitud, longitud: verified.longitud, verificada: true,
    });
});
test('never reuse an unverified profile address, a nearby point, or a different city', () => {
    assert.equal(verifiedLocationAt({ ...verified, verificada: false }, { lat: 11.54, lng: -72.91 }, 1), null);
    assert.equal(verifiedLocationAt(verified, { lat: 11.5401, lng: -72.91 }, 1), null);
    assert.equal(verifiedLocationAt(verified, { lat: 11.54, lng: -72.91 }, 2), null);
    assert.equal(verifiedLocationAt(null, { lat: 11.54, lng: -72.91 }, 1), null);
});
