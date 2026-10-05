// Transporte por pantalla; los servicios REST siguen siendo la autoridad.
export function chatSocketUrl({ wsUrl, apiUrl, id, origin }) {
  if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) throw new Error('Conversación inválida');
  const url = new URL(wsUrl || apiUrl || origin);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) throw new Error('Host inválido');
  url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
  url.pathname = `/ws/chat-citas/${Number(id)}/`; url.search = ''; url.hash = '';
  url.username = ''; url.password = '';
  return url.href;
}

export function createChatRealtime({ url, Socket = WebSocket, reconcile, sendRest, onEvent, onStatus, isOwn,
  isOnline = () => true, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let socket = null, disposed = false, blocked = false, attempts = 0, authRetries = 0;
  let reconnectTimer = null, handshakeTimer = null, typingTimer = null, lastTyping = -Infinity, typingActive = false;
  const timers = new Set(), pending = new Map();
  const later = (fn, delay) => { const key = setTimer(() => { timers.delete(key); if (!disposed) fn(); }, delay); timers.add(key); return key; };
  const cancel = key => { if (key != null) { clearTimer(key); timers.delete(key); } };
  const status = value => { if (!disposed) onStatus(value); };
  const frame = (event, data) => {
    if (disposed || socket?.readyState !== 1) return false;
    try { socket.send(JSON.stringify({ event, data })); return true; } catch { return false; }
  };
  function fallback(entry) {
    if (entry.fallback || disposed) return;
    entry.fallback = true; cancel(entry.timer);
    Promise.resolve().then(() => { if (disposed) throw new Error('Pantalla cerrada'); return sendRest(entry.payload); }).then(entry.resolve, entry.reject).finally(() => {
      if (pending.get(entry.payload.client_message_id) === entry) pending.delete(entry.payload.client_message_id);
    });
  }
  async function recover() {
    try { return await reconcile(); } catch { return false; }
  }
  function schedule(code) {
    if (disposed || blocked) return;
    if (!isOnline()) { status('offline'); return; }
    if (attempts >= 5 || ([4401, 4403, 4404].includes(code) && authRetries++ >= 1)) { status('disconnected'); return; }
    attempts++;
    status('reconnecting');
    const reconnect = async () => {
      reconnectTimer = null;
      const allowed = await recover();
      if (disposed || blocked) return;
      if (!allowed) { blocked = true; status('disconnected'); return; }
      connect();
    };
    if ([4401, 4403, 4404].includes(code)) void reconnect();
    else reconnectTimer = later(reconnect, Math.min(1000 * 2 ** (attempts - 1), 16000));
  }
  function detach() {
    if (!socket) return;
    const old = socket; socket = null;
    old.onopen = old.onmessage = old.onerror = old.onclose = null;
    if (old.readyState < 2) old.close();
    cancel(handshakeTimer); handshakeTimer = null;
  }
  function connect() {
    if (disposed || blocked || socket?.readyState < 2) return;
    if (!isOnline()) { status('offline'); return; }
    status(attempts ? 'reconnecting' : 'connecting');
    let current;
    try { current = new Socket(url); socket = current; } catch { schedule(); return; }
    handshakeTimer = later(() => { detach(); schedule(); }, 10000);
    current.onopen = async () => {
      if (disposed || current !== socket) return;
      cancel(handshakeTimer); handshakeTimer = null; status('connected');
      // Channels no es durable; recuperar siempre la ventana reciente al conectar.
      await recover();
    };
    current.onmessage = event => {
      if (disposed || current !== socket) return;
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      if (!packet || typeof packet.event !== 'string' || !packet.data || typeof packet.data !== 'object') return;
      const { event: kind, data } = packet;
      const entry = pending.get(data.client_message_id);
      if (kind === 'chat.message.created' && entry && isOwn(data) && Number.isSafeInteger(data.id) && data.id > 0 &&
          data.conversacion_id === Number(url.match(/chat-citas\/(\d+)/)?.[1])) {
        cancel(entry.timer); pending.delete(data.client_message_id); entry.resolve(data);
      }
      // ACK no contiene el mensaje completo: esperar created o recuperar por REST.
      if (kind === 'chat.error') pending.forEach(fallback);
      onEvent(kind, data);
    };
    current.onerror = () => { /* onclose/timeout es el único responsable de reconexión. */ };
    current.onclose = event => {
      if (disposed || current !== socket) return;
      detach(); pending.forEach(fallback); schedule(event.code);
    };
  }
  function typing(value) {
    if (disposed) return;
    cancel(typingTimer); typingTimer = null;
    if (!value) { if (typingActive) frame('chat.typing', { escribiendo: false }); typingActive = false; return; }
    if (now() - lastTyping >= 1200 && frame('chat.typing', { escribiendo: true })) { lastTyping = now(); typingActive = true; }
    if (typingActive) typingTimer = later(() => typing(false), 1800);
  }
  return {
    start: connect,
    retry: () => { if (disposed || socket?.readyState < 2) return; blocked = false; attempts = 0; authRetries = 0; cancel(reconnectTimer); reconnectTimer = null; connect(); },
    send: payload => {
      typing(false);
      if (disposed) return Promise.reject(new Error('Pantalla cerrada'));
      if (socket?.readyState !== 1) return sendRest(payload);
      const existing = pending.get(payload.client_message_id);
      if (existing) return existing.promise;
      const entry = { payload, fallback: false };
      entry.promise = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject; });
      pending.set(payload.client_message_id, entry);
      entry.timer = later(() => fallback(entry), 4000);
      if (!frame('chat.message.send', payload)) fallback(entry);
      return entry.promise;
    },
    typing,
    network: () => {
      cancel(reconnectTimer); reconnectTimer = null;
      if (!isOnline()) { typing(false); detach(); pending.forEach(fallback); status('offline'); }
      else if (!blocked && socket?.readyState !== 1) { attempts = 0; connect(); }
    },
    stop: () => { blocked = true; typing(false); detach(); pending.forEach(fallback); status('disconnected'); },
    dispose: () => {
      typing(false); disposed = true; detach(); timers.forEach(clearTimer); timers.clear();
      pending.forEach(entry => entry.reject(new Error('Pantalla cerrada'))); pending.clear();
    },
  };
}
