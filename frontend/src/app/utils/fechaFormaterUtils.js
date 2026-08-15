export default function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);

    return {
        fecha: fecha.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }),

        hora: fecha.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        })
    };
}

export function formatearFechaRelativa(isoString) {
    if (!isoString) return "";

    const fecha = new Date(isoString);
    if (isNaN(fecha.getTime())) return "Fecha inválida";

    const ahora = new Date();
    const diferenciaSegundos = Math.round((fecha - ahora) / 1000);

    // Unidades de tiempo en segundos
    const minutos = Math.round(diferenciaSegundos / 60);
    const horas = Math.round(diferenciaSegundos / 3600);
    const dias = Math.round(diferenciaSegundos / 86400);

    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

    if (Math.abs(diferenciaSegundos) < 60) {
        return rtf.format(diferenciaSegundos, 'second'); // "hace 5 segundos" o "en 5 segundos"
    } else if (Math.abs(minutos) < 60) {
        return rtf.format(minutos, 'minute');           // "hace 10 minutos"
    } else if (Math.abs(horas) < 24) {
        return rtf.format(horas, 'hour');               // "hace 2 horas"
    } else {
        return rtf.format(dias, 'day');                 // "hace 3 días" o "mañana"
    }
}