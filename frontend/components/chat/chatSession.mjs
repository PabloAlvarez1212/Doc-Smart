import { chatError, mergeMessages, presentation, readTarget, validateFile } from './chatState.mjs';

// Estado transitorio por pantalla. No se guarda contenido clínico en el navegador.
export function createChatSession({ api, id, role, uuid = () => crypto.randomUUID(), isVisible = () => true,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  let state = { conversation: null, messages: [], cursor: null, hasMore: false, loading: true,
    loadingOlder: false, sending: false, uploading: false, acting: false, denied: false,
    error: '', readError: '', historyNotice: '', text: '', attachments: [], pending: null, readCursor: 0,
    connection: 'disconnected', remoteTyping: false, remoteReadCursor: 0 };
  let disposed = false;
  let revision = 0;
  let historyStarted = false;
  let historyTop = null;
  let realtime = null, readTimer = null, remoteTypingTimer = null, refreshTimer = null;
  let reading = null;
  let boundaryTimer = null;
  const listeners = new Set();
  const update = patch => {
    if (disposed) return;
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  function failure(error, query = false) {
    const info = chatError(error);
    const invalidate = info.status === 401 || (query && info.denied);
    if (invalidate) { revision++; historyStarted = false; historyTop = null; realtime?.stop(); }
    update({ error: info.message, ...(invalidate ? {
      denied: true, conversation: null, messages: [], attachments: [], pending: null, text: '', loading: false, loadingOlder: false, remoteTyping: false,
    } : {}) });
    return info;
  }
  async function read(messages) {
    while (reading) await reading;
    if (disposed || state.denied || !isVisible()) return;
    const operation = readOnce(mergeMessages(state.messages, messages));
    reading = operation;
    try { await operation; } finally { if (reading === operation) reading = null; }
  }
  async function readOnce(messages) {
    const ticket = revision;
    const target = readTarget(messages, role, state.readCursor);
    if (!target) return;
    try {
      const result = await api.leer(id, target);
      if (disposed || ticket !== revision) return;
      update({ readCursor: Math.max(state.readCursor, result.ultimo_mensaje_id || 0), readError: '',
        conversation: { ...state.conversation, no_leidos: result.no_leidos } });
    } catch (error) {
      if (disposed || ticket !== revision) return;
      const info = chatError(error);
      if (info.denied) failure(error, true);
      else update({ readError: 'No pudimos actualizar la lectura. Usa Actualizar para reintentarlo.' });
    }
  }
  async function refresh() {
    if (disposed) return false;
    const ticket = ++revision;
    update({ loading: true, loadingOlder: false, error: '' });
    try {
      // Cada rechazo de permiso se procesa aunque el otro request haya fallado primero.
      const protect = request => request.catch(error => {
        if (!disposed && ticket === revision && chatError(error).denied) failure(error, true);
        throw error;
      });
      const [conversation, history] = await Promise.all([protect(api.detalle(id)), protect(api.historial(id, { limit: 50 }))]);
      if (disposed || ticket !== revision) return false;
      const cursor = conversation[role === 'medico' ? 'ultimo_leido_medico' : 'ultimo_leido_paciente'] || 0;
      const incoming = history.results;
      const gap = historyTop !== null && history.has_more && incoming.length > 0 &&
        Math.min(...incoming.map(message => message.id)) > historyTop;
      // Reiniciar la ventana acotada evita saltar páginas intermedias sin descargarlas todas.
      const latest = Math.max(0, ...incoming.map(message => message.id));
      const newer = state.messages.filter(message => message.id > latest);
      const messages = mergeMessages(gap ? newer : state.messages, incoming);
      const snapshotTop = Math.max(latest, conversation.ultimo_mensaje?.id || 0);
      const addedUnread = newer.filter(message => message.id > snapshotTop && message.id > Math.max(cursor, state.readCursor) && message.emisor?.tipo !== role).length;
      conversation.no_leidos = Math.max(0, (conversation.no_leidos || 0) + addedUnread);
      const recovered = state.pending && messages.find(message => message.emisor?.tipo === role &&
        message.client_message_id === state.pending.client_message_id);
      update({ conversation, messages, denied: false, readCursor: Math.max(state.readCursor, cursor),
        remoteReadCursor: Math.max(state.remoteReadCursor, conversation[role === 'medico' ? 'ultimo_leido_paciente' : 'ultimo_leido_medico'] || 0),
        ...(!historyStarted || gap ? { cursor: history.next_before, hasMore: history.has_more } : {}),
        ...(gap ? { historyNotice: 'Llegaron muchos mensajes. Se muestra la página más reciente; puedes cargar los anteriores.' } : {}),
        ...(recovered ? { pending: null, attachments: [], text: '' } : {}) });
      historyStarted = true;
      clearTimer(boundaryTimer); boundaryTimer = null;
      const boundaries = [conversation.fecha_habilitacion_automatica, conversation.fecha_cierre_automatico, conversation.cita?.fecha_programada]
        .map(value => Date.parse(value)).filter(value => Number.isFinite(value) && value > Date.now());
      if (boundaries.length) boundaryTimer = setTimer(async () => {
        boundaryTimer = null;
        if (!disposed && !state.denied) await refresh();
      }, Math.min(Math.min(...boundaries) - Date.now() + 250, 2147483647));
      if (conversation.estado !== 'activo') { realtime?.typing(false); update({ remoteTyping: false }); }
      if (incoming.length) historyTop = Math.max(...incoming.map(message => message.id));
      await read(messages);
      return true;
    } catch (error) {
      if (ticket === revision) failure(error, true);
      return false;
    } finally {
      if (ticket === revision) update({ loading: false });
    }
  }
  async function loadOlder() {
    if (disposed || state.loading || state.loadingOlder || !state.hasMore) return;
    const ticket = revision;
    update({ loadingOlder: true, error: '' });
    try {
      const page = await api.historial(id, { antes_de: state.cursor, limit: 50 });
      if (disposed || ticket !== revision) return;
      const messages = mergeMessages(state.messages, page.results);
      update({ messages, cursor: page.next_before, hasMore: page.has_more, historyNotice: '' });
      await read(messages);
    } catch (error) { if (ticket === revision) failure(error, true); }
    finally { if (ticket === revision) update({ loadingOlder: false }); }
  }
  async function send() {
    if (disposed || state.loading || state.loadingOlder || state.sending || state.uploading || state.acting) return false;
    const capabilities = presentation(state.conversation, role);
    if (!state.pending && !capabilities.canWrite && !capabilities.canNote) return false;
    const payload = state.pending || { client_message_id: uuid(), contenido: state.text.trim(),
      modalidad: capabilities.canWrite ? 'mensaje' : 'nota_previa', adjunto_ids: state.attachments.map(file => file.id) };
    if ((!payload.contenido && !payload.adjunto_ids.length) || payload.contenido.length > 4000) return false;
    update({ sending: true, pending: payload, error: '' });
    try {
      realtime?.typing(false);
      const message = await (realtime ? realtime.send(payload) : api.enviar(id, payload));
      if (disposed || state.denied) return false;
      update({ messages: mergeMessages(state.messages, [message]), pending: null, text: '', attachments: [] });
      await refresh();
      return true;
    } catch (error) {
      const info = chatError(error);
      if (!info.uncertain) update({ pending: null });
      if ([403, 409].includes(info.status)) await refresh();
      failure(error);
      return false;
    } finally { update({ sending: false }); }
  }
  async function upload(files) {
    if (disposed || state.loading || state.loadingOlder || state.pending || state.uploading || state.sending || state.acting) return;
    const capabilities = presentation(state.conversation, role);
    if (!capabilities.canWrite && !capabilities.canNote) return;
    if (state.attachments.length + files.length > 5) { update({ error: 'Puedes adjuntar un máximo de cinco archivos.' }); return; }
    const invalid = files.map(validateFile).find(Boolean);
    if (invalid) { update({ error: invalid }); return; }
    update({ uploading: true, error: '' });
    try {
      for (const file of files) {
        const uploaded = await api.subir(id, file);
        if (disposed || state.denied) return;
        update({ attachments: [...state.attachments, uploaded] });
      }
    } catch (error) {
      if ([403, 409].includes(chatError(error).status)) await refresh();
      failure(error);
    } finally { update({ uploading: false }); }
  }
  async function action(kind) {
    if (disposed || state.acting || state.sending || state.uploading) return;
    update({ acting: true, error: '' });
    try {
      if (kind === 'inasistencia') await api.inasistencia(state.conversation.cita.id);
      else await api.habilitar(id);
      await refresh();
    } catch (error) {
      await refresh();
      failure(error);
    } finally { update({ acting: false }); }
  }
  async function attachmentUrl(fileId) {
    if (disposed || state.denied) throw { response: { status: 403 } };
    try {
      const result = await api.urlAdjunto(id, fileId);
      if (disposed || state.denied) throw { response: { status: 403 } };
      return result;
    } catch (error) {
      // 404 de archivo no prueba revocación del chat; 401/403 sí invalidan inmediatamente.
      failure(error, [401, 403].includes(chatError(error).status));
      throw error;
    }
  }
  function queueRefresh() {
    if (refreshTimer !== null) return;
    refreshTimer = setTimer(async () => { refreshTimer = null; if (!disposed && !state.denied) await refresh(); }, 150);
  }
  function receive(event, data) {
    if (disposed || state.denied || !state.conversation) return;
    const other = data.actor && data.actor.tipo !== role &&
      (!state.conversation.otro_participante || (data.actor.tipo === state.conversation.otro_participante.tipo && data.actor.id === state.conversation.otro_participante.id));
    if (event === 'chat.message.created') {
      if (data.conversacion_id !== id || !Number.isSafeInteger(data.id) || data.id < 1) return;
      const unseen = !state.messages.some(message => message.id === data.id || (data.client_message_id &&
        message.client_message_id === data.client_message_id && message.emisor?.tipo === data.emisor?.tipo && message.emisor?.id === data.emisor?.id));
      const confirmed = state.pending && data.emisor?.tipo === role && data.client_message_id === state.pending.client_message_id;
      update({ messages: mergeMessages(state.messages, [data]), ...(confirmed ? { pending: null, text: '', attachments: [], error: '' } : {}), conversation: { ...state.conversation,
        no_leidos: Math.max(0, (state.conversation.no_leidos || 0) + (unseen && data.emisor?.tipo !== role && data.id > state.readCursor ? 1 : 0)) } });
      if (isVisible() && readTimer === null) readTimer = setTimer(async () => { readTimer = null; await read(state.messages); }, 100);
    } else if (event === 'chat.message.read' && other && Number.isSafeInteger(data.ultimo_mensaje_id) && data.ultimo_mensaje_id > 0) {
      update({ remoteReadCursor: Math.max(state.remoteReadCursor, data.ultimo_mensaje_id) });
    } else if (event === 'chat.typing' && other && typeof data.escribiendo === 'boolean') {
      clearTimer(remoteTypingTimer); remoteTypingTimer = null;
      update({ remoteTyping: data.escribiendo && state.conversation.estado === 'activo' });
      if (state.remoteTyping) remoteTypingTimer = setTimer(() => { remoteTypingTimer = null; update({ remoteTyping: false }); }, 4500);
    } else if (event === 'chat.conversation.updated' && data.id === id) {
      if (['programado', 'activo', 'cerrado'].includes(data.estado)) update({ conversation: { ...state.conversation, ...data } });
      if (data.estado !== 'activo') { realtime?.typing(false); update({ remoteTyping: false }); }
      queueRefresh();
    } else if (event === 'chat.error') {
      // El protocolo no correlaciona errores con UUID: REST determina el resultado del envío.
      if ([401, 403, 404, 409].includes(data.status)) queueRefresh();
    }
  }
  return {
    getSnapshot: () => state, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    refresh, loadOlder, send, upload, action, attachmentUrl, receive,
    attachRealtime: transport => { realtime = transport; },
    retryRealtime: () => { if (!state.denied && state.conversation) realtime?.retry(); },
    connection: value => update({ connection: value, ...(value !== 'connected' ? { remoteTyping: false } : {}) }),
    setText: text => { if (!state.pending && !state.sending) {
      update({ text }); realtime?.typing(!!text.trim() && presentation(state.conversation, role).canWrite);
    } },
    removeAttachment: fileId => { if (!state.pending && !state.sending && !state.uploading) update({ attachments: state.attachments.filter(file => file.id !== fileId) }); },
    dispose: () => { realtime?.typing(false); disposed = true; revision++; listeners.clear();
      [readTimer, refreshTimer, remoteTypingTimer, boundaryTimer].forEach(clearTimer);
      state = { ...state, messages: [], conversation: null, text: '', attachments: [], pending: null }; },
  };
}
