import test from 'node:test';
import assert from 'node:assert/strict';
import { presentation, mergeMessages, readTarget, validateFile, systemText, chatError } from './chatState.mjs';
import { createChatSession } from './chatSession.mjs';

const conversation = (estado = 'activo') => ({ id: 7, estado, tiene_nota_previa: false,
  no_leidos: 2, cita: { id: 9, estado: 'confirmada', fecha_programada: '2026-01-01T15:00:00Z' } });
const message = (id, tipo = 'medico', extra = {}) => ({ id, tipo, emisor: { tipo, id: 10 }, contenido: 'hola', ...extra });
function fixture(overrides = {}) {
  const calls = [];
  const api = {
    detalle: async () => conversation(), historial: async () => ({ results: [message(3), message(2)], has_more: true, next_before: 2 }),
    leer: async (id, pk) => { calls.push(['read', pk]); return { ultimo_mensaje_id: pk, changed: true, no_leidos: 0 }; },
    enviar: async (id, payload) => { calls.push(['send', payload]); return message(4, 'paciente', { client_message_id: payload.client_message_id }); },
    subir: async () => ({ id: 21, nombre: 'x.pdf' }), habilitar: async () => conversation(),
    inasistencia: async () => {}, ...overrides,
  };
  return { session: createChatSession({ api, id: 7, role: 'paciente', uuid: () => 'stable-uuid' }), api, calls };
}
test('estado backend separa lectura, composer y acciones de cada rol', () => {
  assert.equal(presentation(conversation('cerrado'), 'paciente').canWrite, false);
  assert.equal(presentation(conversation('programado'), 'paciente').canNote, true);
  assert.equal(presentation({ ...conversation('programado'), tiene_nota_previa: true }, 'paciente').canNote, false);
  assert.equal(presentation(conversation('programado'), 'medico').canEnable, true);
  assert.equal(presentation(conversation(), 'paciente').canEnable, false);
  assert.equal(presentation(conversation(), 'medico', Date.parse('2026-01-01T14:00Z')).canAbsence, false);
  assert.equal(presentation(conversation(), 'medico', Date.parse('2026-01-01T15:00Z')).canAbsence, true);
  assert.equal(presentation({ ...conversation(), cita: { estado: 'completada' } }, 'medico').canAbsence, false);
});
test('historial descendente se ordena cronológico y deduplica ID/UUID propio tipado', () => {
  const rows = mergeMessages([message(3), message(2)], [message(1), message(2, 'medico', { contenido: 'actual' })]);
  assert.deepEqual(rows.map(m => m.id), [1, 2, 3]);
  assert.equal(rows[1].contenido, 'actual');
  assert.equal(mergeMessages([message(1, 'paciente', { client_message_id: 'same' })],
    [message(2, 'medico', { client_message_id: 'same' })]).length, 2);
});
test('lectura recibidos/sistema, excluye propios y nunca retrocede', () => {
  assert.equal(readTarget([message(4, 'paciente'), message(3)], 'paciente', 2), 3);
  assert.equal(readTarget([message(4, 'sistema', { emisor: null })], 'paciente', 3), 4);
  assert.equal(readTarget([message(3)], 'paciente', 4), null);
});
test('adjuntos formatos, límites exactos, tamaño y extensión', () => {
  for (const [type, name, max] of [['image/jpeg', 'x.jpg', 8], ['image/png', 'x.png', 8], ['image/webp', 'x.webp', 8], ['application/pdf', 'x.pdf', 10]]) {
    assert.equal(validateFile({ type, name, size: max * 1024 ** 2 }), '');
    assert.match(validateFile({ type, name, size: max * 1024 ** 2 + 1 }), /máximo/);
  }
  assert.ok(validateFile({ type: 'text/html', name: 'x.html', size: 1 }));
  assert.ok(validateFile({ type: 'image/png', name: 'x.pdf', size: 1 }));
});
test('sistema no presenta metadata arbitraria; errores seguros y conflictos útiles', () => {
  assert.equal(systemText({ metadata: { evento: 'inasistencia_paciente', secret: 'hidden' } }), 'Se registró la inasistencia del paciente.');
  assert.equal(chatError({ response: { status: 403, data: { secret: 'traceback' } } }).denied, true);
  assert.match(chatError({ response: { status: 409, data: { errores: { code: 'idempotency_conflict' } } } }).message, /UUID/);
});
test('carga inicial marca lectura agregada una vez y reconcilia no leídos', async () => {
  const { session, calls } = fixture();
  await session.refresh();
  assert.deepEqual(session.getSnapshot().messages.map(m => m.id), [2, 3]);
  assert.equal(session.getSnapshot().conversation.no_leidos, 0);
  await session.refresh();
  assert.deepEqual(calls, [['read', 3]]);
});
test('mensaje perdido → cerrado → retry conserva UUID/payload y respuesta real', async () => {
  let fail = true;
  const { session, api, calls } = fixture({ enviar: async (id, payload) => {
    calls.push(['send', { ...payload }]);
    if (fail) throw new Error('network');
    return message(8, 'paciente', { client_message_id: payload.client_message_id });
  } });
  await session.refresh(); session.setText('  hola  ');
  assert.equal(await session.send(), false);
  assert.equal(session.getSnapshot().messages.length, 2);
  session.setText('cambio no autorizado en retry');
  api.detalle = async () => conversation('cerrado');
  api.historial = async () => ({ results: [], has_more: false, next_before: null });
  await session.refresh(); fail = false;
  assert.equal(await session.send(), true);
  const sends = calls.filter(c => c[0] === 'send');
  assert.deepEqual(sends[0][1], sends[1][1]);
  assert.equal(sends[1][1].contenido, 'hola');
  assert.equal(session.getSnapshot().pending, null);
  assert.equal(session.getSnapshot().messages.at(-1).id, 8);
});
test('paginación usa cursor, deduplica y no cambia orden', async () => {
  const { session, api } = fixture(); await session.refresh();
  api.historial = async (id, params) => {
    assert.equal(params.antes_de, 2);
    return { results: [message(2), message(1)], has_more: false, next_before: null };
  };
  await session.loadOlder();
  assert.deepEqual(session.getSnapshot().messages.map(m => m.id), [1, 2, 3]);
  assert.equal(session.getSnapshot().hasMore, false);
});
test('nota y adjunto usan modalidad explícita; vacíos no se envían', async () => {
  const { session, calls } = fixture({ detalle: async () => conversation('programado') });
  await session.refresh(); assert.equal(await session.send(), false);
  await session.upload([{ name: 'x.pdf', type: 'application/pdf', size: 8 }]);
  assert.equal(await session.send(), true);
  const payload = calls.find(c => c[0] === 'send')[1];
  assert.equal(payload.modalidad, 'nota_previa');
  assert.deepEqual(payload.adjunto_ids, [21]);
});
test('403 de consulta borra historial y deshabilita vista; 409 refresca estado', async () => {
  const { session, api } = fixture(); await session.refresh(); session.setText('hola');
  api.enviar = async () => { throw { response: { status: 409 } }; };
  await session.send(); assert.equal(session.getSnapshot().pending, null);
  api.detalle = async () => { throw { response: { status: 403 } }; };
  await session.refresh();
  assert.equal(session.getSnapshot().denied, true);
  assert.deepEqual(session.getSnapshot().messages, []);
});
test('acciones habilitar/inasistencia refrescan contrato, sin inferir cierre local', async () => {
  const { session, api } = fixture(); await session.refresh();
  await session.action('habilitar');
  api.inasistencia = async id => { assert.equal(id, 9); api.detalle = async () => conversation('cerrado'); };
  await session.action('inasistencia');
  assert.equal(session.getSnapshot().conversation.estado, 'cerrado');
});
test('respuesta de una vista desmontada no repuebla datos ni marca lectura', async () => {
  let resolve;
  const { session, calls } = fixture({ detalle: () => new Promise(r => { resolve = r; }) });
  const request = session.refresh(); session.dispose(); resolve(conversation()); await request;
  assert.deepEqual(session.getSnapshot().messages, []);
  assert.deepEqual(calls, []);
});
test('más de una página nueva entre refrescos reinicia cursor sin hueco histórico', async () => {
  const { session, api } = fixture(); await session.refresh();
  api.historial = async (id, params) => params.antes_de
    ? { results: [message(53), message(52), message(51), message(3)], has_more: true, next_before: 3 }
    : { results: Array.from({ length: 50 }, (_, index) => message(103 - index)), has_more: true, next_before: 54 };
  await session.refresh();
  assert.equal(session.getSnapshot().cursor, 54);
  await session.loadOlder();
  assert.ok(session.getSnapshot().messages.find(message => message.id === 53));
});
test('consulta en pestaña oculta no marca lectura hasta refresco visible', async () => {
  let visible = false; const calls = [];
  const session = createChatSession({ role: 'paciente', id: 7, isVisible: () => visible, api: {
    detalle: async () => conversation(), historial: async () => ({ results: [message(3)] }),
    leer: async () => { calls.push('read'); return { ultimo_mensaje_id: 3, no_leidos: 0 }; },
  } });
  await session.refresh(); assert.deepEqual(calls, []);
  visible = true; await session.refresh(); assert.deepEqual(calls, ['read']);
});
test('401 de envío limpia contenido protegido aunque falle renovación de sesión', async () => {
  const { session } = fixture({ enviar: async () => { throw { response: { status: 401 } }; } });
  await session.refresh(); session.setText('privado'); await session.send();
  assert.equal(session.getSnapshot().denied, true);
  assert.equal(session.getSnapshot().text, '');
  assert.deepEqual(session.getSnapshot().messages, []);
});
test('doble click mientras POST pendiente no crea segundo intento lógico', async () => {
  let finish; const payloads = [];
  const { session } = fixture({ enviar: (id, payload) => {
    payloads.push(payload); return new Promise(resolve => { finish = resolve; });
  } });
  await session.refresh(); session.setText('hola');
  const first = session.send(); assert.equal(await session.send(), false);
  finish(message(9, 'paciente')); await first;
  assert.equal(payloads.length, 1);
});
test('archivo inválido/más de cinco se rechaza antes de upload; fallos conservan publicados pendientes', async () => {
  let uploaded = 0;
  const { session } = fixture({ subir: async () => { uploaded++; if (uploaded === 2) throw Error('network'); return { id: 21, nombre: 'x.pdf' }; } });
  await session.refresh();
  const file = { name: 'x.pdf', type: 'application/pdf', size: 8 };
  await session.upload(Array(6).fill(file)); assert.equal(uploaded, 0);
  await session.upload([{ ...file, type: 'text/html' }]); assert.equal(uploaded, 0);
  await session.upload([file, file]);
  assert.equal(session.getSnapshot().attachments.length, 1);
  assert.equal(session.getSnapshot().uploading, false);
});
test('403 tardío de historial invalida vista aunque detalle haya fallado antes por red', async () => {
  const { session, api } = fixture(); await session.refresh();
  let rejectHistory;
  api.detalle = async () => { throw { response: { status: 500 } }; };
  api.historial = () => new Promise((resolve, reject) => { rejectHistory = reject; });
  await session.refresh();
  rejectHistory({ response: { status: 403 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(session.getSnapshot().denied, true);
  assert.deepEqual(session.getSnapshot().messages, []);
});
test('URL adjunto denegada invalida primero aunque refresco posterior falle por red', async () => {
  const { session, api } = fixture(); await session.refresh();
  api.urlAdjunto = async () => { throw { response: { status: 403 } }; };
  await assert.rejects(() => session.attachmentUrl(21));
  api.detalle = async () => { throw Error('network'); };
  await session.refresh();
  assert.equal(session.getSnapshot().denied, true);
  assert.deepEqual(session.getSnapshot().messages, []);
});
test('enviar durante carga anterior no solapa requests ni bloquea loadingOlder', async () => {
  const { session, api, calls } = fixture(); await session.refresh(); session.setText('hola');
  let finish;
  api.historial = () => new Promise(resolve => { finish = resolve; });
  const older = session.loadOlder();
  const send = session.send();
  finish({ results: [message(1)], has_more: false, next_before: null });
  await older;
  // La petición de envío no debe comenzar mientras carga la página histórica.
  assert.equal(calls.filter(call => call[0] === 'send').length, 0);
  assert.equal(await send, false);
  assert.equal(session.getSnapshot().loadingOlder, false);
});
test('refresco invalida carga anterior pendiente y limpia su indicador', async () => {
  const { session, api } = fixture(); await session.refresh();
  let finish;
  api.historial = async (id, params) => params.antes_de ? new Promise(resolve => { finish = resolve; })
    : { results: [message(4)], has_more: true, next_before: 4 };
  const older = session.loadOlder(); await session.refresh();
  finish({ results: [message(1)], has_more: false, next_before: null }); await older;
  assert.equal(session.getSnapshot().loadingOlder, false);
});
