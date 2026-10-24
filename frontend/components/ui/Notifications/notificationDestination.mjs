function positiveId(value) {
    if ((typeof value !== 'number' && typeof value !== 'string') || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
        throw new Error('El recurso relacionado no tiene un identificador válido.');
    }
    return Number(value);
}
export function notificationDestination(data, role) {
    if (!['patient','doctor'].includes(role)) throw new Error('Rol no compatible.');
    const id = positiveId(data?.id);
    let route;
    if (data.tipo === 'cita') route = `/${role}/my-appointments?cita=${id}`;
    else if (data.tipo === 'conversacion') route = `/${role}/my-chats/${id}`;
    else if (data.tipo === 'historial') route = role === 'patient'
        ? `/patient/my-medical-history?historial=${id}`
        : `/doctor/my-appointments?historial=${id}&cita=${positiveId(data.cita_id)}`;
    else throw new Error('Esta notificación no tiene un recurso compatible.');
    if (data.ruta != null && data.ruta !== route) throw new Error('El destino de la notificación no es válido.');
    return route;
}
