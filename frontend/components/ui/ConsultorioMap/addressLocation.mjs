const text = c => c?.longText || c?.long_name || '';
const short = c => c?.shortText || c?.short_name || text(c);
export class ClinicLocationError extends Error {}
export function normalizeLocation(value) {
  const name = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ({bogotadc:'bogota',bogotadistritocapital:'bogota',santafedebogota:'bogota',cartagenadeindias:'cartagena'})[name] || name;
}
export function validateClinicCity(components, city) {
  if (!city?.id) throw new ClinicLocationError('Selecciona la ciudad del consultorio antes de buscar la dirección.');
  const list = Array.isArray(components) ? components : [];
  const find = type => list.find(c => c.types?.includes(type));
  if (short(find('country')).toUpperCase() !== 'CO') throw new ClinicLocationError('Selecciona una dirección en Colombia.');
  const municipality = find('locality') || find('postal_town') || find('administrative_area_level_3') || find('administrative_area_level_2');
  const department = find('administrative_area_level_1');
  if (!municipality || normalizeLocation(text(municipality)) !== normalizeLocation(city.nombre) ||
      (city.departamento && (!department || normalizeLocation(text(department)) !== normalizeLocation(city.departamento)))) {
    throw new ClinicLocationError(`La dirección no corresponde a ${city.nombre}${city.departamento ? ', '+city.departamento : ''}. Selecciona una dirección de esa ciudad.`);
  }
}
export function clinicAddress(components, city) {
  validateClinicCity(components, city);
  const list = Array.isArray(components) ? components : [];
  const find = type => list.find(c => c.types?.includes(type));
  const road = short(find('route')).trim();
  const number = short(find('street_number')).trim().replace(/^#\s*/, '');
  if (!road || !number) throw new ClinicLocationError('Selecciona una dirección completa con calle y número, no solo una ciudad o un barrio.');
  const neighborhood = ['neighborhood','sublocality_level_2','sublocality_level_1','sublocality'].map(find).find(Boolean);
  const barrio = text(neighborhood).trim();
  const street = `${road} #${number}`;
  const direccion = barrio && normalizeLocation(barrio) !== normalizeLocation(city.nombre) ? `${street}, ${barrio}` : street;
  if (direccion.length > 100) throw new ClinicLocationError('La dirección y el barrio superan los 100 caracteres permitidos. Selecciona un resultado más preciso.');
  return {direccion, barrio};
}
