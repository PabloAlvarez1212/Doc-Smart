import test from 'node:test';
import assert from 'node:assert/strict';
import * as realtime from './chatRealtime.mjs';

function fixture() {
  const sockets = [], timers = new Map(), statuses = [], events = [], rest = [];
  let serial = 0, now = 0, allowed = true, online = true;
  class Socket {
    constructor(url) { this.url = url; this.readyState = 0; this.frames = []; sockets.push(this); }
    send(text) { this.frames.push(JSON.parse(text)); }
    close() { this.readyState = 3; this.closed = true; }
    open() { this.readyState = 1; this.onopen?.(); }
    receive(event, data) { this.onmessage?.({ data: JSON.stringify({ event, data }) }); }
    drop(code = 1006) { this.readyState = 3; this.onclose?.({ code }); }
  }
  const transport = realtime.createChatRealtime({ url: 'wss://api.test/ws/chat-citas/7/', Socket, isOwn: message => message.emisor?.tipo === 'paciente',
    reconcile: async () => allowed, onEvent: (event, data) => events.push([event, data]),
    onStatus: status => statuses.push(status), isOnline: () => online, now: () => now,
    setTimer: (fn, delay) => { const key = ++serial; timers.set(key, { fn, delay }); return key; },
    clearTimer: key => timers.delete(key),
    sendRest: async payload => { rest.push(payload); return { id: 9, client_message_id: payload.client_message_id }; },
  });
  const tick = async () => { const [key, timer] = timers.entries().next().value; timers.delete(key); now += timer.delay; timer.fn(); await new Promise(resolve => setImmediate(resolve)); };
  return { transport, sockets, timers, statuses, events, rest, tick, deny: () => { allowed = false; }, offline: () => { online = false; } };
}
const payload = { client_message_id: 'one-uuid', contenido: 'hola', modalidad: 'mensaje', adjunto_ids: [] };
const dto = { id: 9, conversacion_id: 7, client_message_id: 'one-uuid', emisor: { tipo: 'paciente', id: 1 } };

test('URL usa configuración de host, http/ws y https/wss sin tokens', () => {
  assert.equal(realtime.chatSocketUrl({ apiUrl: 'https://api.test/api', id: 7 }), 'wss://api.test/ws/chat-citas/7/');
  assert.equal(realtime.chatSocketUrl({ wsUrl: 'http://localhost:8000/', id: 7 }), 'ws://localhost:8000/ws/chat-citas/7/');
});
for (const order of [['chat.message.ack', 'chat.message.created'], ['chat.message.created', 'chat.message.ack']]) {
  test(`confirmación independiente del orden ${order.join(' → ')}`, async () => {
    const f = fixture(); f.transport.start(); f.sockets[0].open();
    const sending = f.transport.send(payload);
    for (const event of order) f.sockets[0].receive(event, event.endsWith('ack') ? { id: 9, client_message_id: 'one-uuid', created: true } : dto);
    assert.deepEqual(await sending, dto); assert.equal(f.rest.length, 0);
    assert.deepEqual(f.sockets[0].frames[0], { event: 'chat.message.send', data: payload });
    f.transport.dispose(); assert.equal(f.timers.size, 0); assert.ok(f.sockets[0].closed);
  });
}
test('ACK sin created recupera DTO por REST con el mismo UUID; created sin ACK confirma', async () => {
  const f = fixture(); f.transport.start(); f.sockets[0].open();
  const sending = f.transport.send(payload);
  f.sockets[0].receive('chat.message.ack', { id: 9, client_message_id: 'one-uuid', created: false });
  await f.tick(); assert.equal((await sending).id, 9); assert.deepEqual(f.rest, [payload]);
  const second = f.transport.send(payload); f.sockets[0].receive('chat.message.created', dto);
  assert.deepEqual(await second, dto); f.transport.dispose();
});
test('cierre durante envío usa REST y reconecta con reconciliación, sin sockets simultáneos', async () => {
  const f = fixture(); f.transport.start(); f.transport.start(); assert.equal(f.sockets.length, 1);
  f.sockets[0].open(); const sending = f.transport.send(payload); f.sockets[0].drop();
  assert.equal((await sending).id, 9); assert.deepEqual(f.rest, [payload]);
  await f.tick(); assert.equal(f.sockets.length, 2); f.sockets[1].open();
  assert.equal(f.statuses.at(-1), 'connected'); f.transport.dispose();
});
test('permiso revocado detiene reconexión y agotamiento limita rechazos de handshake', async () => {
  const f = fixture(); f.transport.start(); f.deny(); f.sockets[0].drop(4403);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(f.timers.size, 0);
  assert.equal(f.statuses.at(-1), 'disconnected'); f.transport.dispose();
  const g = fixture(); g.transport.start();
  for (let i = 0; i < 5; i++) { g.sockets.at(-1).drop(); await g.tick(); }
  g.sockets.at(-1).drop(); assert.equal(g.timers.size, 0); g.transport.dispose();
});
test('typing limita starts, stop no pierde evento, offline y dispose cancelan timers', async () => {
  const f = fixture(); f.transport.start(); f.sockets[0].open();
  f.transport.typing(true); f.transport.typing(true); assert.equal(f.sockets[0].frames.length, 1);
  await f.tick(); assert.equal(f.sockets[0].frames.at(-1).data.escribiendo, false);
  f.transport.typing(true); f.transport.dispose(); assert.equal(f.timers.size, 0);
  const g = fixture(); g.offline(); g.transport.start(); assert.equal(g.sockets.length, 0);
  assert.equal(g.statuses.at(-1), 'offline'); assert.equal((await g.transport.send(payload)).id, 9); g.transport.dispose();
});
test('error WS sin UUID no atribuye fallo de typing al envío: recupera mediante REST', async () => {
  const f = fixture(); f.transport.start(); f.sockets[0].open(); const sending = f.transport.send(payload);
  f.sockets[0].receive('chat.error', { status: 403, code: 'forbidden' });
  assert.equal((await sending).id, 9); assert.equal(f.rest.length, 1); f.transport.dispose();
});
test('UUID de otro actor no confirma el intento propio ni borra el timeout', async () => {
  const f = fixture(); f.transport.start(); f.sockets[0].open(); const sending = f.transport.send(payload);
  f.sockets[0].receive('chat.message.created', { ...dto, emisor: { tipo: 'medico', id: 1 } });
  assert.equal(f.timers.size, 1, 'el UUID ajeno no cancela recuperación del intento propio');
  await f.tick(); assert.equal((await sending).id, 9); assert.equal(f.rest.length, 1); f.transport.dispose();
});
test('timeout de handshake recupera autorización antes de reemplazar socket', async () => {
  const f = fixture(); f.transport.start(); await f.tick(); assert.ok(f.sockets[0].closed);
  await f.tick(); assert.equal(f.sockets.length, 2); f.transport.dispose(); assert.equal(f.timers.size, 0);
});
test('desmontar antes de iniciar fallback cancela nueva escritura REST', async () => {
  const f = fixture(); f.transport.start(); f.sockets[0].open(); const sending = f.transport.send(payload);
  f.sockets[0].drop(); f.transport.dispose(); await assert.rejects(sending);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(f.rest.length, 0); assert.equal(f.timers.size, 0);
});
