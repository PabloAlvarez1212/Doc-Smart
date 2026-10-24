import { validateClinicCity } from './addressLocation.mjs';

export function cityViewport(results, city, point) {
    const municipalityTypes = ['locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_2'];
    const place = results?.find(result => {
        if (!result.types?.some(type => municipalityTypes.includes(type))) return false;
        try { validateClinicCity(result.address_components, city); return true; } catch { return false; }
    });
    const viewport = place?.geometry?.viewport;
    const bounds = viewport?.toJSON ? viewport.toJSON() : viewport;
    if (!bounds || !['north','south','east','west'].every(key => Number.isFinite(bounds[key])) ||
        bounds.north > 90 || bounds.south < -90 || bounds.east > 180 || bounds.west < -180 ||
        bounds.north <= bounds.south || bounds.east <= bounds.west ||
        !Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) {
        throw new Error('No se encontró el encuadre de la ciudad seleccionada.');
    }
    return { north: Math.max(bounds.north, point.lat), south: Math.min(bounds.south, point.lat),
        east: Math.max(bounds.east, point.lng), west: Math.min(bounds.west, point.lng) };
}
