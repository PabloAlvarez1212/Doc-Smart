import { ClinicLocationError } from './addressLocation.mjs';

export function geocodingErrorMessage(error) {
    if (error instanceof ClinicLocationError) return error.message;
    const status = `${error?.code || ''} ${error?.message || ''}`;
    if (status.includes('REQUEST_DENIED')) {
        return 'La verificación de ubicaciones no está autorizada por Google. Selecciona una dirección de las sugerencias o contacta con soporte.';
    }
    if (/OVER_QUERY_LIMIT|OVER_DAILY_LIMIT/.test(status)) {
        return 'El servicio de ubicación alcanzó su límite de consultas. Espera un momento y vuelve a intentar.';
    }
    if (status.includes('ZERO_RESULTS')) {
        return 'Google no devolvió una dirección completa para este punto. Acércalo a la entrada del consultorio o selecciona una sugerencia.';
    }
    return 'No pudimos conectar con el servicio de ubicación. Conservamos la dirección anterior; vuelve a intentar o selecciona una sugerencia.';
}

// Only reuse a location actually verified in this session, at the same precision
// as the stored coordinates. A nearby point must be reverse-geocoded again.
export function verifiedLocationAt(location, point, cityId) {
    if (!location?.verificada || location.cityId !== cityId || !location.direccion) return null;
    const pairs = [[location.latitud, point?.lat], [location.longitud, point?.lng]];
    if (!pairs.every(([a, b]) => a != null && b != null && a !== '' && b !== '' &&
        Number.isFinite(Number(a)) && Number.isFinite(Number(b)) &&
        Number(a).toFixed(7) === Number(b).toFixed(7))) return null;
    return { direccion: location.direccion, latitud: location.latitud, longitud: location.longitud, verificada: true };
}
