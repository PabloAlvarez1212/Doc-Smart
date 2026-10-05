import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire, Module } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as chatState from './chatState.mjs';
import { createChatService } from '../../src/app/services/chatServiceFactory.mjs';

// Compilador JSX ya incluido en Next; node:test sigue siendo la infraestructura.
const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');
function jsx(file) {
  const filename = path.resolve(file);
  const compiled = new Module(filename);
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled.require = name => {
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (name.endsWith('chatState.mjs')) return chatState;
    if (name.startsWith('.') || name.startsWith('@/')) {
      let target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (!path.extname(target)) target += '.js';
      return jsx(target);
    }
    return require(name);
  };
  compiled._compile(transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  }).code, filename);
  return compiled.exports;
}
const { ChatListView, ChatComposer, ChatMessage, ClinicalActions, ChatConnection } = jsx('components/chat/ChatUI.js');
const conv = estado => ({ id: 7, estado, no_leidos: 3, tiene_nota_previa: false,
  cita: { id: 9, estado: 'confirmada', fecha_programada: '2026-01-01T15:00Z' },
  otro_participante: { nombre: 'Ana', apellido: 'Pérez', tipo: 'medico', id: 102 } });
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test('estados WS comprensibles y lectura solo para mensaje propio confirmado por cursor', () => {
  for (const [state, label] of [['connecting', 'Conectando'], ['connected', 'Conectado'], ['reconnecting', 'Reconectando'], ['offline', 'Sin conexión'], ['disconnected', 'Tiempo real no disponible']]) {
    assert.match(render(ChatConnection, { connection: state }), new RegExp(label));
  }
  const message = { id: 8, emisor: { tipo: 'paciente' }, tipo: 'mensaje', contenido: 'Hola' };
  assert.match(render(ChatMessage, { message, role: 'paciente', readCursor: 8 }), /Leído/);
  assert.doesNotMatch(render(ChatMessage, { message, role: 'paciente', readCursor: 7 }), /Leído/);
  assert.doesNotMatch(render(ChatMessage, { message, role: 'medico', readCursor: 8 }), /Leído/);
});
test('listado paciente/médico conserva orden, links de rol y no leídos', () => {
  for (const [role, route] of [['paciente', 'patient'], ['medico', 'doctor']]) {
    const html = render(ChatListView, { role, data: { results: [conv('activo')], count: 1 }, page: 1 });
    assert.match(html, new RegExp(`/${route}/my-chats/7`));
    assert.match(html, /Ana Pérez/); assert.match(html, /3 sin leer/);
  }
});
test('cerrado conserva textarea deshabilitada; programado muestra nota solo paciente', () => {
  const state = { conversation: conv('cerrado'), text: '', attachments: [], pending: null };
  const html = render(ChatComposer, { state, role: 'paciente' });
  assert.match(html, /textarea[^>]*disabled/); assert.match(html, /cerrado/);
  assert.match(render(ChatComposer, { state: { ...state, conversation: conv('programado') }, role: 'paciente' }), /Enviar nota previa/);
  assert.doesNotMatch(render(ChatComposer, { state: { ...state, conversation: conv('programado') }, role: 'medico' }), /Enviar nota previa/);
});
test('cargar anteriores bloquea composer mientras está pendiente', () => {
  const html = render(ChatComposer, { state: { conversation: conv('activo'), loadingOlder: true, text: 'hola', attachments: [] }, role: 'paciente' });
  assert.match(html, /textarea[^>]*disabled/);
});
test('retry persistido sigue disponible con chat cerrado y editor congelado', () => {
  const html = render(ChatComposer, { state: { conversation: conv('cerrado'), pending: { client_message_id: 'same' }, text: 'hola', attachments: [] }, role: 'paciente' });
  assert.match(html, /textarea[^>]*disabled/);
  assert.match(html, />Reintentar mismo mensaje<\/button>/);
  assert.doesNotMatch(html, /<button[^>]*disabled[^>]*>Reintentar mismo mensaje/);
});
test('notificaciones enlazan al chat del rol correcto sin cambiar las acciones previas', () => {
  const NotificationsList = jsx('components/patient/Notifications/NotificationsList/NotificationsList.js').default;
  const notification = { id: 1, titulo: 'Nuevo mensaje', mensaje: 'Información nueva', tipo: 'mensaje_nuevo', leida: false, conversacion_id: 7 };
  for (const [rol, root] of [['paciente', 'patient'], ['medico', 'doctor']]) {
    const html = render(NotificationsList, { rol, data: { notificaciones: [notification] } });
    assert.match(html, new RegExp(`/${root}/my-chats/7`));
    assert.match(html, /Marcar como leida/);
  }
});
test('médico tiene acciones clínicas cuando corresponde y paciente no', () => {
  assert.match(render(ClinicalActions, { conversation: conv('programado'), role: 'medico' }), /Habilitar chat/);
  assert.match(render(ClinicalActions, { conversation: conv('activo'), role: 'medico' }), /Inasistencia del paciente/);
  assert.equal(render(ClinicalActions, { conversation: conv('activo'), role: 'paciente' }), '');
});
test('contenido escapa HTML, nota/sistema se distinguen y adjunto solo muestra metadatos seguros', () => {
  const html = render(ChatMessage, { role: 'paciente', message: { id: 1, tipo: 'nota_previa', contenido: '<img src=x onerror=alert(1)>',
    emisor: { tipo: 'paciente' }, adjuntos: [{ id: 3, nombre: 'x.pdf', content_type: 'application/pdf', storage_key: 'hidden' }] } });
  assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img src=x/); assert.match(html, /Nota previa/);
  assert.match(html, /x.pdf/); assert.doesNotMatch(html, /hidden/);
  assert.match(render(ChatMessage, { message: { tipo: 'sistema', metadata: { evento: 'cita_cancelada' } } }), /cancelada/);
});
test('REST service usa endpoints, cursores, payload intacto, upload sin Content-Type manual y URL temporal', async () => {
  const requests = [];
  const api = Object.fromEntries(['get', 'post', 'put'].map(method => [method, async (...args) => {
    requests.push([method, ...args]); return { data: { ok: true, data: { id: 1 } } };
  }]));
  const service = createChatService(api);
  await service.listar({ page: 2 }); await service.historial(7, { antes_de: 42 });
  const payload = { client_message_id: 'stable', contenido: 'hola' };
  await service.enviar(7, payload); await service.leer(7, 42); await service.habilitar(7);
  await service.subir(7, new File(['%PDF-'], 'x.pdf', { type: 'application/pdf' }));
  await service.urlAdjunto(7, 3);
  assert.deepEqual(requests[0][2].params, { page: 2, page_size: 20 });
  assert.equal(requests[1][2].params.antes_de, 42);
  assert.equal(requests[2][2], payload);
  assert.deepEqual(requests[3].slice(0, 3), ['put', '/chat-citas/conversaciones/7/lectura/', { ultimo_mensaje_id: 42 }]);
  assert.equal(requests[5][2].get('archivo').name, 'x.pdf');
  assert.equal(requests[5].length, 3);
  assert.equal(requests[6][1], '/chat-citas/conversaciones/7/adjuntos/3/url/');
  assert.throws(() => service.detalle('../otro'));
});
