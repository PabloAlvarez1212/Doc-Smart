export function summarizeToday(appointments = []) {
  const count = state => appointments.filter(item => item.estado?.toLowerCase() === state).length;
  return { total: appointments.length, pendientes: count('pendiente'), confirmadas: count('confirmada'), completadas: count('completada') };
}
export function nextAppointment(appointments = []) {
  return [...appointments].filter(item => item.fecha_programada && !['cancelada', 'completada'].includes(item.estado?.toLowerCase())).sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))[0] || null;
}
export function appointmentDate(value, timeOnly = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', ...(timeOnly ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', day: 'numeric', month: 'short' }) }).format(date);
}

export function filterToday(appointments = [], filter = 'todas') {
  return [...appointments]
    .filter(item => filter === 'todas' || item.estado?.toLowerCase() === filter)
    .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada));
}

// Separa la hora del periodo para la columna de la línea de tiempo: { hora: '10:30', periodo: 'a. m.' }.
export function agendaTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { hora: '--:--', periodo: '' };
  const parts = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(date);
  const hora = parts.filter(part => ['hour', 'literal', 'minute'].includes(part.type)).map(part => part.value).join('').trim();
  const periodo = parts.find(part => part.type === 'dayPeriod')?.value ?? '';
  return { hora, periodo };
}

// La siguiente cita de hoy que todavía no empieza y sigue activa.
export function nextToday(appointments = [], now = Date.now()) {
  return filterToday(appointments).find(item => {
    const time = new Date(item.fecha_programada).getTime();
    return time >= now && !['cancelada', 'completada', 'rechazada'].includes(item.estado?.toLowerCase());
  }) || null;
}

export function timeUntil(value, now = Date.now()) {
  const minutes = Math.round((new Date(value).getTime() - now) / 60000);
  if (minutes <= 0) return 'ahora';
  if (minutes < 60) return `en ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `en ${hours} h ${rest} min` : `en ${hours} h`;
}
