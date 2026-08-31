import test from "node:test";
import assert from "node:assert/strict";
import { isEndCommand } from "./bymaxVoiceSession.mjs";
import { createBymaxVoiceController } from "./bymaxVoiceController.mjs";

function setup(overrides = {}) {
  const timers = new Map(); let timerId = 0;
  const recognitions = [], audios = [], utterances = [], received = [], revoked = [];
  class Recognition {
    constructor() { recognitions.push(this); this.starts = 0; this.aborts = 0; }
    start() { this.starts += 1; }
    abort() { this.aborts += 1; if (!overrides.delayedEnd) this.onend?.(); }
  }
  class Audio {
    constructor() { audios.push(this); this.plays = 0; this.pauses = 0; this.reject = overrides.audioReject; }
    play() { this.plays += 1; return this.reject ? Promise.reject(Object.assign(new Error(), { name: this.reject })) : Promise.resolve(); }
    pause() { this.pauses += 1; }
    load() {}
    removeAttribute() {}
  }
  const browser = {
    SpeechRecognition: Recognition, isSecureContext: true, Audio,
    performance: {now:()=>0},
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: { speak: utterance => utterances.push(utterance), cancel() {} },
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn,ms}); return id; },
    clearTimeout: id => timers.delete(id),
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: value => revoked.push(value) },
    ...overrides.browser,
  };
  const states = [];
  const controller = createBymaxVoiceController({ browser, notify: state => states.push(state),
    generateVoice: overrides.generateVoice || (() => Promise.resolve({size:10,type:"audio/mpeg"})),
    onTranscript: text => received.push(text), onPartial: text => received.push(`partial:${text}`), onWake: () => received.push("wake"),
    isBusy: () => Boolean(overrides.busy),
  });
  const timeout = ms => { for (const [id, item] of [...timers]) { if (item.ms === ms) { timers.delete(id); item.fn(); } } };
  return { controller, browser, recognitions, audios, utterances, received, states, timers, timeout, revoked };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function result(text, index = 0, final = true) {
  return {resultIndex:index, results:[...Array(index).fill(Object.assign([{transcript:"ignored"}],{isFinal:true})), Object.assign([{transcript:text}],{isFinal:final})]};
}
function listen(env) { env.controller.startListening(); env.recognitions[0].onstart(); return env.recognitions[0]; }

test("voice responses default on; waiting ignores ambient conversations", () => {
  const e=setup(); const r=listen(e);
  assert.equal(e.controller.snapshot().enabled,true);
  assert.equal(e.controller.snapshot().mic,"waiting");
  r.onresult(result("vamos a revisar las citas")); e.timeout(1600);
  assert.deepEqual(e.received,[]);
  e.timeout(15000); e.timeout(60000);
  assert.equal(e.controller.snapshot().mic,"waiting");
});
test("wake variants accept same-phrase commands only once after speech settles", () => {
  for(const wake of ["Bymax","Hey Bymax","Hola Bymax","Oye Bymax","Baymax"]) {
    const e=setup(); const r=listen(e);
    r.onresult(result(wake+", consulta mis citas"));
    assert.equal(e.controller.snapshot().mic,"listening");
    assert.ok(!e.received.includes("consulta mis citas"));
    e.timeout(1600); r.onresult(result(wake+", consulta mis citas"));
    assert.equal(e.received.filter(value=>value==="consulta mis citas").length,1);
    assert.equal(e.controller.snapshot().mic,"paused");
  }
});
test("separate wake and multi-part request accumulate final results", () => {
  const e=setup(); const r=listen(e);
  r.onresult(result("Bymax"));
  r.onresult(result("Cuáles son",1));
  r.onresult(result("mis próximas",2,false)); e.timeout(1600);
  assert.ok(!e.received.includes("Cuáles son"));
  r.onresult(result("mis próximas citas",2)); e.timeout(1600);
  assert.ok(e.received.includes("Cuáles son mis próximas citas"));
});
test("a wake without a request times out back to waiting, not off", () => {
  const e=setup(); const r=listen(e); r.onresult(result("Bymax"));
  e.timeout(20000); e.timeout(350); r.onstart();
  assert.equal(e.controller.snapshot().mic,"waiting"); assert.equal(e.recognitions.length,1);
});
test("mobile recognition ending after just Bymax retains the request phase", () => {
  const e=setup();const r=listen(e);r.onresult(result("Bymax"));r.onend();e.timeout(1000);r.onstart();
  assert.equal(e.controller.snapshot().mic,"listening");
  r.onresult(result("consulta mis citas"));e.timeout(1600);assert.ok(e.received.includes("consulta mis citas"));assert.equal(e.recognitions.length,1);
});
test("complete response and audio queue must both finish before returning to waiting", async () => {
  const e=setup(); const r=listen(e);
  r.onresult(result("Bymax consulta mis citas")); e.timeout(1600);
  e.controller.enqueue("Primera.","a"); e.controller.enqueue("Segunda.","a"); await flush();
  e.audios[0].onplaying(); e.audios[0].onended(); await flush();
  assert.equal(r.starts,1);
  e.controller.completeTurn(); e.timeout(350); assert.equal(r.starts,1);
  e.audios[0].onplaying(); e.audios[0].onended(); e.timeout(350); r.onstart();
  assert.equal(r.starts,2); assert.equal(e.recognitions.length,1); assert.equal(e.controller.snapshot().mic,"waiting");
});
test("a gap between stream fragments never reopens recognition", async () => {
  const e=setup(); const r=listen(e); e.controller.beginTurn();
  e.controller.enqueue("Primera.","a"); await flush(); e.audios[0].onended(); e.timeout(350);
  assert.equal(r.starts,1); e.controller.enqueue("Segunda.","a"); await flush();
  assert.equal(e.audios[0].plays,2);
});
test("voice OFF preserves recognition and skips all response synthesis", () => {
  const e=setup(); const r=listen(e); e.controller.setEnabled(false);
  r.onresult(result("Bymax consulta mis citas")); e.timeout(1600);
  e.controller.enqueue("Respuesta.","a"); e.controller.completeTurn(); e.timeout(350); r.onstart();
  assert.equal(e.audios.length,0); assert.equal(e.utterances.length,0);
  assert.equal(e.controller.snapshot().mic,"waiting");
  e.controller.startListening(); assert.equal(e.controller.snapshot().enabled,false);
});
test("bounded recovery reuses one recognition and stops after repeated immediate ends", () => {
  const e=setup(); const r=listen(e);
  for(const delay of [1000,2000,4000]) { r.onend(); e.timeout(delay); r.onstart(); }
  r.onend();
  assert.equal(e.recognitions.length,1); assert.equal(r.starts,4);
  assert.equal(e.controller.snapshot().mic,"error"); assert.equal(e.controller.snapshot().active,false);
  assert.equal(e.timers.size,0);
});
test("healthy waiting resets the consecutive failure budget", () => {
  const e=setup(); const r=listen(e);
  for(let i=0;i<8;i++) { e.timeout(10000); r.onend(); e.timeout(1000); r.onstart(); }
  assert.equal(e.controller.snapshot().mic,"waiting"); assert.equal(e.recognitions.length,1);
});
test("permissions denied stop recognition without retry", () => {
  const e=setup(); const r=listen(e); r.onerror({error:"not-allowed"});
  e.timeout(350); e.timeout(1000);
  assert.equal(r.starts,1); assert.equal(e.controller.snapshot().mic,"error"); assert.match(e.controller.snapshot().error,/Permiso/);
});
test("unsupported and insecure contexts provide actionable errors", () => {
  for(const browser of [{SpeechRecognition:undefined},{isSecureContext:false}]) {
    const e=setup({browser});e.controller.startListening();assert.equal(e.controller.snapshot().mic,"error");assert.equal(e.recognitions.length,0);
  }
});
test("webkit prefix starts in the user call without another microphone acquisition", () => {
  const e=setup(); const second=setup({browser:{SpeechRecognition:undefined,webkitSpeechRecognition:e.browser.SpeechRecognition}});
  second.controller.startListening();assert.equal(e.recognitions[0].starts,1);
});
test("end phrases are recognized while negations and unrelated text are preserved", () => {
  for(const phrase of ["terminar conversación","termina la conversación","finalizar conversación","finaliza la conversación","terminemos","ya terminamos","terminar","detener conversación","para la conversación","deja de escuchar","no quiero continuar"]) {
    assert.equal(isEndCommand(phrase),true,phrase); assert.equal(isEndCommand("Bymax, "+phrase),true,phrase);
  }
  for(const phrase of ["no quiero terminar conversación","quiero terminar mi tratamiento","cuándo debo terminar","no terminemos"]) assert.equal(isEndCommand(phrase),false,phrase);
});
test("ending by voice prevents later responses, visibility recovery and restart", async () => {
  const e=setup(); const r=listen(e); r.onresult(result("Bymax, termina la conversación"));
  assert.equal(e.controller.snapshot().mic,"ended"); assert.equal(e.controller.snapshot().active,false);
  e.controller.enqueue("Respuesta atrasada.","late"); e.controller.completeTurn();
  e.controller.setVisible(false);e.controller.setVisible(true);e.timeout(350);await flush();
  assert.equal(r.starts,1);assert.equal(e.audios.length,0);
  e.controller.startListening();r.onstart();assert.equal(e.controller.snapshot().mic,"waiting");assert.equal(e.recognitions.length,1);
});
test("an explicit end intention works in waiting without repeating the wake word", () => {
  const e=setup();const r=listen(e);r.onresult(result("terminar conversación"));
  assert.equal(e.controller.snapshot().mic,"ended");assert.equal(e.controller.snapshot().active,false);
});
test("ending during an in-flight audio download ignores its result", async () => {
  let resolve;const e=setup({generateVoice:()=>new Promise(done=>{resolve=done;})});listen(e);
  e.controller.enqueue("Respuesta.","a");e.controller.endConversation();resolve({size:10,type:"audio/mpeg"});await flush();
  assert.equal(e.audios.length,0);assert.equal(e.controller.snapshot().mic,"ended");
});
test("disabling microphone does not resume after a text response", () => {
  const e=setup();const r=listen(e);e.controller.stopListening();e.controller.beginTurn();e.controller.completeTurn();e.timeout(350);
  assert.equal(e.controller.snapshot().mic,"stopped");assert.equal(r.starts,1);
});
test("hidden page suspends; returning resumes only a still enabled session", () => {
  const e=setup();const r=listen(e);e.controller.setVisible(false);
  assert.equal(e.controller.snapshot().mic,"suspended");e.controller.enqueue("No hablar oculta.","a");assert.equal(e.audios.length,0);
  e.controller.setVisible(true);e.timeout(350);r.onstart();assert.equal(e.controller.snapshot().mic,"waiting");
  e.controller.stopListening();e.controller.setVisible(false);e.controller.setVisible(true);e.timeout(350);assert.equal(r.starts,2);
});
test("recognition waits for abort onend before using the same instance again", () => {
  const e=setup({delayedEnd:true});const r=listen(e);e.controller.beginTurn();e.controller.completeTurn();e.timeout(350);assert.equal(r.starts,1);
  r.onend();e.timeout(350);assert.equal(r.starts,2);assert.equal(e.recognitions.length,1);
});
test("missing abort completion is surfaced, not an endless restart", () => {
  const e=setup({delayedEnd:true});listen(e);e.controller.beginTurn();e.timeout(3000);
  assert.equal(e.controller.snapshot().mic,"error");assert.match(e.controller.snapshot().error,/Recarga/);
});
test("autoplay blocked response exposes manual replay without a retry loop", async () => {
  const e=setup({audioReject:"NotAllowedError"});e.controller.enqueue("hola","a");await flush();
  assert.equal(e.controller.snapshot().playback,"ready");assert.equal(e.audios[0].plays,1);
  e.timeout(12000);assert.equal(e.audios[0].plays,1);
  e.audios[0].reject=null;e.controller.play("","a");assert.equal(e.audios[0].plays,2);
});
test("blocked audio does not prevent return to wake-word waiting", async () => {
  const e=setup({audioReject:"NotAllowedError"});const r=listen(e);e.controller.beginTurn();e.controller.enqueue("hola","a");await flush();
  e.controller.completeTurn();e.timeout(350);r.onstart();assert.equal(e.controller.snapshot().mic,"waiting");
});
test("stop playback cancels future fragments of the same response", async () => {
  const e=setup();e.controller.enqueue("primera","a");await flush();e.controller.stopPlayback();e.controller.enqueue("segunda","a");await flush();
  assert.equal(e.audios[0].plays,1);assert.equal(e.controller.snapshot().playback,"stopped");
  e.controller.play("completa","a");await flush();assert.equal(e.audios[0].plays,2);
});
test("neural error falls back once to a Spanish device voice", async () => {
  const e=setup({generateVoice:()=>Promise.reject(Error("network"))});e.controller.enqueue("hola","a");await flush();
  assert.equal(e.utterances.length,1);assert.equal(e.utterances[0].lang,"es-CO");
});
test("old phrase callbacks cannot finish the next playing phrase", async () => {
  const e=setup();e.controller.enqueue("uno","a");e.controller.enqueue("dos","a");await flush();const old=e.audios[0].onended;old();await flush();
  old();assert.equal(e.controller.snapshot().messageId,"a");assert.equal(e.controller.snapshot().playback,"starting");
});
test("dispose clears microphone, timers, pending synthesis and late callbacks", async () => {
  let resolve;const e=setup({generateVoice:()=>new Promise(done=>{resolve=done;})});listen(e);e.controller.enqueue("hola","a");e.controller.dispose();resolve({size:10,type:"audio/mpeg"});await flush();
  assert.equal(e.audios.length,0);assert.equal(e.timers.size,0);
});
