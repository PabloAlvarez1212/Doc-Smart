// Mirrors existing range rules for immediate feedback. The server remains authoritative.
export function scheduleErrors(blocks) {
  return blocks.map((block, index) => {
    if (!block.hora_inicio || !block.hora_fin) return 'Completa la hora de inicio y de fin.';
    if (block.hora_inicio >= block.hora_fin) return 'La hora de fin debe ser posterior al inicio.';
    if (blocks.some((other, j) => j !== index && other.hora_inicio < block.hora_fin && block.hora_inicio < other.hora_fin)) return 'Este horario se solapa con otro bloque. Ajusta las horas.';
    return '';
  });
}
export function errorText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(errorText).filter(Boolean).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(errorText).filter(Boolean).join(' ');
  return '';
}
