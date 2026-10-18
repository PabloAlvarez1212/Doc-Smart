import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { assistantState, messageBlocks } from "./bymaxPresentation.mjs";

const state = (props = {}) => assistantState({ voice: { mic: "off", playback: "idle" }, ...props });

test('tarjetas de citas médicas y de paciente muestran el código sin duplicarlo ni confundir médicos', async () => {
  const require = createRequire(import.meta.url);
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const bindings = await require('next/dist/build/swc').loadBindings();
  const source = readFileSync(new URL('./BymaxMessage.jsx', import.meta.url), 'utf8');
  const {code} = await bindings.transform(source, {jsc: {parser: {syntax:'ecmascript', jsx:true}, transform: {react:{runtime:'automatic'}}}, module:{type:'commonjs'}});
  const module = {exports:{}};
  const load = id => {
    if (id.endsWith('.css')) return {};
    if (id === 'next/image') return props => React.createElement('img', {src:props.src, alt:props.alt});
    return require(id);
  };
  runInNewContext(`(function(require,module,exports){${code}\n})`)(load, module, module.exports);
  const render = data => renderToStaticMarkup(React.createElement(module.exports.default, {item:{id:1, remitente:'bot', texto:'', resultado:{data}}, voice:{}, streaming:false}));
  for (const cita of [
    {id_cita:12, paciente:{id:1,nombre:'Miguel'}, fecha_programada:'2026-10-22T20:30:00-05:00'},
    {id:12, medico:'Katy', fecha:'2026-10-22T20:30:00-05:00'},
  ]) {
    const html = render({citas:[{...cita, codigo_cita:'DOC-UBSJY2NB', estado:'confirmada'}]});
    assert.equal((html.match(/Código: DOC-UBSJY2NB/g) || []).length, 1);
    assert.ok(!html.includes('Paciente #'));
    assert.ok(html.includes('confirmada'));
  }
  assert.ok(!render({medicos:[{id_medico:1,nombre:'Katy',codigo_cita:'DOC-UBSJY2NB'}]}).includes('Código:'));
});
test("audio preparation and autoplay gating never claim the assistant is speaking", () => {
  assert.equal(state({ voice: { playback: "starting" } }).status, "processing");
  assert.equal(state({ voice: { playback: "ready" } }).status, "off");
  assert.equal(state({ voice: { playback: "speaking" } }).status, "speaking");
});
test("only observed listening is shown; waiting and recovery remain distinct", () => {
  for (const mic of ["waiting", "listening", "recovering", "suspended", "ended", "off"]) {
    assert.equal(state({ voice: { mic } }).status, mic);
  }
  assert.equal(state({ voice: { mic: "starting" } }).status, "recovering");
});
test("text-only requests, loading, disconnected transport and response failures are visible", () => {
  assert.equal(state({ sending: true }).status, "processing");
  assert.equal(state({ loading: true }).status, "processing");
  assert.equal(state({ connection: "disconnected" }).status, "disconnected");
  assert.equal(state({ lastMessage: { error: true } }).status, "error");
  assert.equal(state({ error: "Failed", sending: true }).status, "error");
});
test("message formatting preserves prose, list order and literal unsafe markup", () => {
  const blocks = messageBlocks("Opciones\n\n3. Lunes\n4. Martes\n\n- Médico **A**\n- Médico B\n<script>alert(1)</script>");
  assert.deepEqual(blocks[2], { type: "ol", start: 3, lines: ["Lunes", "Martes"] });
  assert.deepEqual(blocks[4].lines, ["Médico **A**", "Médico B"]);
  assert.equal(blocks[5].lines[0], "<script>alert(1)</script>");
});
