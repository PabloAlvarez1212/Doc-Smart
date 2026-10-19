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
