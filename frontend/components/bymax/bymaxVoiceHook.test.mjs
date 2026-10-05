import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Module, createRequire } from 'node:module';
import * as voiceModule from './bymaxVoiceController.mjs';
const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');

function mount(actorKey, storage = new Map()) {
  const effects = [], snapshots = [], timers = new Map(), recognitions = [];
  const window = new EventTarget(), document = new EventTarget();
  let serial = 0;
  Object.assign(window, { isSecureContext:true, document, performance:{now:()=>0},
    setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
    SpeechRecognition:class {constructor(){recognitions.push(this);this.aborted=0;}start(){}abort(){this.aborted++;this.onend?.();}},
  });
  window.addEventListener('bymax:voice-state', event=>snapshots.push(event.detail));
  const filename = path.resolve('components/hooks/useBymaxVoice.js');
  const compiled = new Module(filename);compiled.paths=Module._nodeModulePaths(path.dirname(filename));
  compiled.require = name => name === 'react' ? {
    useEffect:fn=>effects.push(fn),useRef:value=>({current:value}),useState:value=>[value,()=>{}],useCallback:fn=>fn,
  } : name.includes('bymaxVoiceController') ? voiceModule : require(name);
  globalThis.__voiceHookTest={window,document,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}};
  const source=transformSync(fs.readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'ecmascript'}},module:{type:'commonjs'}}).code;
  compiled._compile('const {window,document,localStorage}=globalThis.__voiceHookTest;\n'+source,filename);
  delete globalThis.__voiceHookTest;
  compiled.exports.default({actorKey,available:true,generateVoice:async()=>({size:1,type:'audio/mpeg'}),onTranscript:()=>{},onPartial:()=>{},onWake:()=>{},isBusy:()=>false});
  const cleanup=effects[0]();
  return {window, snapshots, timers, recognitions, cleanup, storage,
    enable:value=>window.dispatchEvent(new CustomEvent('bymax:voice-command',{detail:{enabled:value}}))};
}
test('voice preference remains actor-scoped; shared legacy settings never enable another actor', () => {
  const storage=new Map([['bymax_voice_responses','true']]);
  const first=mount('paciente:1',storage);assert.equal(first.snapshots.at(-1).enabled,false);
  first.enable(true);assert.equal(first.recognitions.length,1);first.cleanup();
  const second=mount('medico:1',storage);assert.equal(second.snapshots.at(-1).enabled,false);second.cleanup();
  const restored=mount('paciente:1',storage);assert.equal(restored.snapshots.at(-1).enabled,true);restored.cleanup();
});
test('logout immediately aborts recognition, preserves preference and prevents settings from reviving it', () => {
  const e=mount('paciente:2');e.enable(true);e.window.dispatchEvent(new Event('docsmart:session-ending'));
  assert.equal(e.recognitions[0].aborted,1);assert.equal(e.timers.size,0);assert.equal(e.snapshots.at(-1),null);
  e.window.dispatchEvent(new Event('bymax:voice-query'));assert.equal(e.snapshots.at(-1),null);
  e.enable(true);assert.equal(e.recognitions.length,1);assert.equal(e.storage.get('bymax_voice_responses:paciente:2'),'true');e.cleanup();
});
test('unmount prevents future Configuration commands from acquiring a microphone', () => {
  const e=mount('paciente:3');e.enable(true);e.cleanup();e.enable(true);
  assert.equal(e.recognitions.length,1);assert.equal(e.recognitions[0].aborted,1);assert.equal(e.timers.size,0);
});
