import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Module, createRequire } from 'node:module';
import { createChatSession } from './chatSession.mjs';
import { chatSocketUrl, createChatRealtime } from './chatRealtime.mjs';
const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');

test('hook por pantalla conecta una vez, retira listeners/timers y descarta respuesta tras desmontar', async () => {
  const effects = [], sockets = [], snapshots = [], timers = new Map(); let serial = 0;
  const windowTarget = new EventTarget(), documentTarget = new EventTarget();
  windowTarget.location = { origin: 'https://doc.test' }; documentTarget.visibilityState = 'visible';
  const listeners = new Set();
  for (const target of [windowTarget, documentTarget]) {
    const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
    target.addEventListener = (kind, callback) => { listeners.add(callback); add(kind, callback); };
    target.removeEventListener = (kind, callback) => { listeners.delete(callback); remove(kind, callback); };
  }
  class Socket { constructor(url) { this.url = url; this.readyState = 0; sockets.push(this); }
    close() { this.closed = true; this.readyState = 3; } }
  const api = { detalle: async () => ({ id: 7, estado: 'activo', no_leidos: 0, cita: { id: 9 } }),
    historial: async () => ({ results: [], has_more: false }), enviar: async () => {}, leer: async () => {} };
  const file = path.resolve('components/chat/useChatConversation.js');
  const compiled = new Module(file); compiled.paths = Module._nodeModulePaths(path.dirname(file));
  compiled.require = name => {
    if (name === 'react') return { useEffect: callback => effects.push(callback), useRef: value => ({ current: value }),
      useState: value => [value, snapshot => snapshots.push(snapshot)] };
    if (name.includes('chatServices')) return { __esModule: true, default: api };
    if (name.includes('appointmentsServices')) return { marcarInasistenciaPacienteService: async () => {} };
    if (name.includes('chatSession.mjs')) return { createChatSession };
    if (name.includes('chatRealtime.mjs')) return { chatSocketUrl, createChatRealtime: options => createChatRealtime({ ...options, Socket,
      setTimer: (fn, delay) => { const key = ++serial; timers.set(key, { fn, delay }); return key; }, clearTimer: key => timers.delete(key) }) };
    return require(name);
  };
  // Ejecutar el hook real con los límites de navegador inyectados, sin framework nuevo.
  const source = transformSync(fs.readFileSync(file, 'utf8'), { filename: file,
    jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } }).code;
  globalThis.__chatWindow = windowTarget; globalThis.__chatDocument = documentTarget;
  // Los bindings de navegador se capturan al compilar.
  compiled._compile(`const navigator = {onLine: true}; const window = globalThis.__chatWindow; const document = globalThis.__chatDocument;\n${source}`, file);
  try {
    compiled.exports.default(7, 'paciente'); const cleanup = effects[0]();
    await new Promise(resolve => setImmediate(resolve)); assert.equal(sockets.length, 1);
    assert.match(sockets[0].url, /\/ws\/chat-citas\/7\/$/); assert.equal(timers.size, 1);
    cleanup(); assert.equal(listeners.size, 0); assert.equal(timers.size, 0); assert.ok(sockets[0].closed);
    const before = snapshots.length; windowTarget.dispatchEvent(new Event('online')); assert.equal(snapshots.length, before);
    const strictCleanup = effects[0](); strictCleanup(); await new Promise(resolve => setImmediate(resolve));
    assert.equal(sockets.length, 1, 'el refresh tardío no conecta una sesión desmontada');
  } finally { delete globalThis.__chatWindow; delete globalThis.__chatDocument; }
});
