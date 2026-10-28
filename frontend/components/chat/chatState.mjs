export function presentation(conversation, role, now = Date.now()) {
  const state = conversation?.estado;
  const clinical = ['confirmada', 'reprogramada'].includes(conversation?.cita?.estado?.toLowerCase());
  const end = Date.parse(conversation?.cita?.fecha_final);
  return {
    canWrite: state === 'activo',
    canNote: role === 'paciente' && (Array.isArray(conversation?.citas_nota_previa)
      ? conversation.citas_nota_previa.length > 0
      : state === 'programado' && clinical && !conversation.tiene_nota_previa),
    canEnable: role === 'medico' && state === 'programado' && clinical,
    canDisable: role === 'medico' && state === 'activo' && conversation.puede_deshabilitar === true,
    // Disponibilidad visual; la acción clínica siempre se valida en el backend.
    canAbsence: role === 'medico' && conversation?.cita?.estado?.toLowerCase() === 'confirmada' && Number.isFinite(end) && end <= now,
    label: { programado: 'Programado', activo: 'Activo', cerrado: 'Cerrado' }[state] || 'No disponible',
    explanation: state === 'programado' ? 'El chat aún no está habilitado para intercambiar mensajes.'
      : state === 'cerrado' ? 'El chat está cerrado. Puedes consultar su historial.'
        : state === 'activo' ? 'Puedes intercambiar mensajes en esta conversación.' : 'No puedes enviar mensajes en este momento.',
  };
}

export function mergeMessages(previous, incoming) {
  const ids = new Map(previous.map(message => [message.id, message]));
  for (const message of incoming) {
    if (message.client_message_id && message.emisor) {
      for (const [id, old] of ids) {
        if (id !== message.id && old.client_message_id === message.client_message_id &&
          old.emisor?.tipo === message.emisor.tipo && old.emisor?.id === message.emisor.id &&
          old.origen_id === message.origen_id) ids.delete(id);
      }
    }
    ids.set(message.id, message);
  }
  return [...ids.values()].sort((a, b) => a.id - b.id);
}

export function readTarget(messages, role, current = 0) {
  const received = messages.filter(message => message.tipo === 'sistema' || message.emisor?.tipo !== role);
  const latest = Math.max(current || 0, ...received.map(message => message.id));
  return latest > (current || 0) ? latest : null;
}

export function validateFile(file) {
  const types = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'], 'application/pdf': ['pdf'] };
  const extension = file.name?.split('.').at(-1)?.toLowerCase();
  if (!types[file.type]?.includes(extension)) return 'Selecciona JPEG, PNG, WebP o PDF con una extensión y tipo válidos.';
  const max = file.type === 'application/pdf' ? 10 : 8;
  if (file.size > max * 1024 ** 2) return `El tamaño máximo es ${max} MiB por archivo.`;
  if (!file.size) return 'El archivo está vacío.';
  return '';
}

export function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function systemText(message) {
  const metadata = message?.metadata || {};
  switch (metadata.evento) {
    case 'chat_habilitado': return 'El médico habilitó el chat anticipadamente.';
    case 'chat_deshabilitado': return 'El médico deshabilitó la apertura anticipada del chat.';
    case 'cita_reprogramada': return `Cita reprogramada${metadata.fecha_nueva ? ' para ' + formatDate(metadata.fecha_nueva) : ''}.`;
    case 'cita_cancelada': return 'La cita fue cancelada.';
    case 'cita_completada': return 'La cita fue completada.';
    case 'inasistencia_paciente': return 'Se registró la inasistencia del paciente.';
    default: return 'Se actualizó la conversación.';
  }
}

export function chatError(error) {
  const status = error?.response?.status;
  const code = error?.response?.data?.errores?.code;
  const messages = {
    400: 'Revisa el mensaje o el archivo. El contenido admite hasta 4000 caracteres y un máximo de cinco adjuntos.',
    401: 'Tu sesión no está vigente. Inicia sesión nuevamente.',
    403: 'No tienes permiso para esta operación o la disponibilidad del chat cambió.',
    404: 'La conversación o el archivo no está disponible.',
    409: code === 'idempotency_conflict' ? 'Este UUID ya corresponde a otro mensaje. Actualiza el historial antes de volver a enviar.'
      : 'La operación ya se realizó o la conversación cambió. Actualiza para consultar su estado.',
    503: 'El archivo no está disponible temporalmente. Inténtalo de nuevo.',
  };
  return { status, code, denied: [401, 403, 404].includes(status),
    uncertain: !status || status >= 500,
    message: messages[status] || 'No se pudo confirmar la operación. Comprueba tu conexión e inténtalo de nuevo.' };
}
