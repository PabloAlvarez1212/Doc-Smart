import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatSession } from './chatSession.mjs';

function fixture({ visible = true } = {}) {
  let state = 'activo', fail = null, history = [], readCalls = [], timerSerial = 0;
  const timers = new Map(), sent = [], typing = [];
  const transport = { send: async payload => { sent.push(payload); return msg(20, 'paciente', payload.client_message_id); },
    typing: value => typing.push(value), stop: () => { transport.stopped = true; } };
  const api = { detalle: async () => { if (fail) throw { response: { status: fail } }; return { id: 7, estado: state,
    no_leidos: 0, ultimo_leido_medico: 2, cita: { id: 9, estado: 'confirmada' } }; },
    historial: async () => ({ results: history, has_more: false, next_before: null }),
    leer: async (id, cursor) => { readCalls.push(cursor); return { ultimo_mensaje_id: cursor, no_leidos: 0 }; },
    enviar: async () => { throw Error('transport not used'); } };
  const session = createChatSession({ api, id: 7, role: 'paciente', isVisible: () => visible, uuid: () => 'stable',
    setTimer: (fn, delay) => { const key = ++timerSerial; timers.set(key, { fn, delay }); return key; }, clearTimer: key => timers.delete(key) });
  const tick = async () => { const [key, timer] = timers.entries().next().value; timers.delete(key); await timer.fn(); };
  return { session, api, transport, timers, sent, typing, readCalls, tick,
    history: value => { history = value; }, status: value => { state = value; }, deny: value => { fail = value; } };
}
const msg = (id, role = 'medico', uuid = null) => ({ id, conversacion_id: 7, tipo: 'mensaje', emisor: { tipo: role, id: 10 },
  client_message_id: uuid, contenido: 'hola', adjuntos: [] });

test('created repetido y REST convergen a un solo mensaje; lectura agregada no tiene loop', async () => {
  const f = fixture(); await f.session.refresh();
  f.session.receive('chat.message.created', msg(8)); f.session.receive('chat.message.created', msg(8));
  assert.equal(f.session.getSnapshot().messages.length, 1);
  await f.tick(); assert.deepEqual(f.readCalls, [8]);
  f.history([msg(8)]); await f.session.refresh(); assert.equal(f.session.getSnapshot().messages.length, 1);
  assert.deepEqual(f.readCalls, [8]); f.session.dispose(); assert.equal(f.timers.size, 0);
});
test('evento de lectura remoto es monotónico y no envía lectura propia', async () => {
  const f = fixture(); await f.session.refresh();
  f.session.receive('chat.message.read', { ultimo_mensaje_id: 12, actor: { tipo: 'medico', id: 10 } });
  f.session.receive('chat.message.read', { ultimo_mensaje_id: 8, actor: { tipo: 'medico', id: 10 } });
  assert.equal(f.session.getSnapshot().remoteReadCursor, 12); assert.deepEqual(f.readCalls, []);
  f.session.dispose();
});
test('typing solo WRITE, timeout remoto, stop al enviar y DTO confirmado por transporte', async () => {
  const f = fixture(); await f.session.refresh(); f.session.attachRealtime(f.transport);
  f.session.setText('hola'); assert.equal(f.typing.at(-1), true);
  f.session.receive('chat.typing', { escribiendo: true, actor: { tipo: 'medico', id: 10 } });
  assert.equal(f.session.getSnapshot().remoteTyping, true); await f.tick(); assert.equal(f.session.getSnapshot().remoteTyping, false);
  assert.equal(await f.session.send(), true); assert.equal(f.typing.at(-1), false);
  assert.equal(f.sent[0].client_message_id, 'stable'); assert.equal(f.session.getSnapshot().messages[0].id, 20);
  f.status('programado'); await f.session.refresh(); f.session.setText('nota'); assert.equal(f.typing.at(-1), false); f.session.dispose();
});
test('updated cierra composer inmediatamente y reconcilia detalle/sistema por REST', async () => {
  const f = fixture(); await f.session.refresh(); f.session.attachRealtime(f.transport); f.session.setText('borrador');
  f.status('cerrado'); f.history([{ ...msg(9), tipo: 'sistema', emisor: null }]);
  f.session.receive('chat.conversation.updated', { id: 7, estado: 'cerrado' });
  assert.equal(f.session.getSnapshot().conversation.estado, 'cerrado'); assert.equal(f.typing.at(-1), false);
  await f.tick(); assert.equal(f.session.getSnapshot().messages[0].tipo, 'sistema');
  assert.equal(f.session.getSnapshot().text, 'borrador'); f.session.dispose();
});
test('revocación elimina contenido y detiene socket, mensajes tardíos no lo restauran', async () => {
  const f = fixture(); await f.session.refresh(); f.session.attachRealtime(f.transport);
  f.deny(403); await f.session.refresh(); assert.equal(f.transport.stopped, true);
  f.session.receive('chat.message.created', msg(8)); assert.equal(f.session.getSnapshot().messages.length, 0);
  f.session.dispose();
});
test('pantalla oculta no marca lectura; conexión y no leídos son del estado de sesión', async () => {
  const f = fixture({ visible: false }); await f.session.refresh(); f.session.connection('reconnecting');
  f.session.receive('chat.message.created', msg(8)); f.session.receive('chat.message.created', msg(8));
  assert.equal(f.session.getSnapshot().connection, 'reconnecting'); assert.equal(f.session.getSnapshot().conversation.no_leidos, 1);
  assert.deepEqual(f.readCalls, []); f.session.dispose();
});
test('lecturas simultáneas se serializan y no restauran contador obsoleto', async () => {
  const f = fixture(); await f.session.refresh(); let finish;
  f.api.leer = async (id, cursor) => { f.readCalls.push(cursor); if (cursor === 8) return new Promise(resolve => { finish = resolve; });
    return { ultimo_mensaje_id: cursor, no_leidos: 0 }; };
  f.session.receive('chat.message.created', msg(8));
  const [key, timer] = f.timers.entries().next().value; f.timers.delete(key); const first = timer.fn();
  f.session.receive('chat.message.created', msg(9));
  const [nextKey, nextTimer] = f.timers.entries().next().value; f.timers.delete(nextKey); const second = nextTimer.fn();
  f.session.receive('chat.message.created', msg(10));
  const [thirdKey, thirdTimer] = f.timers.entries().next().value; f.timers.delete(thirdKey); const third = thirdTimer.fn();
  assert.deepEqual(f.readCalls, [8], 'no emitir lectura concurrente mientras otra está en vuelo');
  finish({ ultimo_mensaje_id: 8, no_leidos: 2 }); await Promise.all([first, second, third]);
  assert.deepEqual(f.readCalls, [8, 10]); assert.equal(f.session.getSnapshot().conversation.no_leidos, 0); f.session.dispose();
});
test('created tardío confirma pendiente tras fallo de fallback REST y descongela composer', async () => {
  const f = fixture(); await f.session.refresh(); f.transport.send = async () => { throw Error('network'); };
  f.session.attachRealtime(f.transport); f.session.setText('hola'); assert.equal(await f.session.send(), false);
  assert.equal(f.session.getSnapshot().pending.client_message_id, 'stable');
  f.session.receive('chat.message.created', msg(20, 'paciente', 'stable'));
  assert.equal(f.session.getSnapshot().pending, null); assert.equal(f.session.getSnapshot().text, '');
  assert.equal(f.session.getSnapshot().error, ''); assert.equal(f.session.getSnapshot().messages.length, 1);
  f.session.dispose();
});
test('ventana REST reiniciada por hueco conserva created recibido durante la consulta', async () => {
  const f = fixture({ visible: false }); f.history([msg(1)]); await f.session.refresh(); let finish;
  f.api.historial = () => new Promise(resolve => { finish = resolve; }); const refreshing = f.session.refresh();
  f.session.receive('chat.message.created', msg(150));
  finish({ results: [msg(149), msg(100)], has_more: true, next_before: 100 }); await refreshing;
  assert.deepEqual(f.session.getSnapshot().messages.map(message => message.id), [100, 149, 150]);
  assert.equal(f.session.getSnapshot().conversation.no_leidos, 1); f.session.dispose();
});
test('límite temporal entregado por backend consulta REST sin inferir el nuevo estado', async () => {
  const f = fixture(); const detail = f.api.detalle; let calls = 0;
  f.api.detalle = async () => { calls++; return { ...await detail(), fecha_cierre_automatico: calls === 1 ? new Date(Date.now() + 5000).toISOString() : null }; };
  await f.session.refresh(); assert.equal(f.timers.size, 1); assert.equal(f.session.getSnapshot().conversation.estado, 'activo');
  f.status('cerrado'); await f.tick(); assert.equal(calls, 2); assert.equal(f.session.getSnapshot().conversation.estado, 'cerrado'); f.session.dispose();
});
