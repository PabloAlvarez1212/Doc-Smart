import test from 'node:test';
import assert from 'node:assert/strict';
import { attachProgressiveAudio } from './bymaxProgressiveAudio.mjs';
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(options = {}) {
 let source, buffer, cancelCount=0, readCount=0, finish;
 class Buffer extends EventTarget { appendBuffer(bytes) { this.bytes=bytes; this.updating=true; if (!options.stallAppend) queueMicrotask(()=>{ this.updating=false; this.dispatchEvent(new Event('updateend')); }); } abort(){this.updating=false; this.aborted=true;} }
 class MediaSource extends EventTarget { constructor(){super();source=this;this.readyState='open';} addSourceBuffer(type){assert.equal(type,'audio/mpeg');buffer=new Buffer();return buffer;} endOfStream(){this.ended=true;} }
 const revoked=[];
 const reader={read(){readCount++;return readCount===1?Promise.resolve({value:new Uint8Array([1,2]),done:false}):new Promise(resolve=>{finish=()=>resolve({done:true});});},cancel(){cancelCount++;finish?.();return Promise.resolve();},releaseLock(){}};
 const browser={MediaSource,URL:{createObjectURL(){return 'mock:stream';},revokeObjectURL(url){revoked.push(url);}}};
 return {browser,stream:options.stream || {getReader:()=>reader},open:()=>source.dispatchEvent(new Event('sourceopen')),finish:()=>finish(),source:()=>source,buffer:()=>buffer,revoked,cancelCount:()=>cancelCount};
}
test('progressive audio is ready after first append before the complete stream',async()=>{
 const f=fixture(), audio={}, errors=[];
 const attached=attachProgressiveAudio({browser:f.browser,audio,stream:f.stream,onError:e=>errors.push(e)});
 f.open();await attached.ready;
 assert.equal(audio.src,'mock:stream');assert.equal(f.source().ended,undefined);
 f.finish();await flush();assert.equal(f.source().ended,true);assert.deepEqual(errors,[]);
 attached.close();assert.deepEqual(f.revoked,['mock:stream']);
});
test('cancel releases stream and URL, including before sourceopen',async()=>{
 const f=fixture(), abort=new AbortController();
 const attached=attachProgressiveAudio({browser:f.browser,audio:{},stream:f.stream,signal:abort.signal,onError(){throw new Error('unexpected playback error');}});
 const rejected=assert.rejects(attached.ready,{name:'AbortError'});abort.abort();await rejected;
 f.open();await flush();assert.equal(f.cancelCount(),1);assert.deepEqual(f.revoked,['mock:stream']);
});

test('failure after first append closes transport and reports one playback error', async () => {
 let count=0; const failure=new Error('provider disconnected');
 const stream={getReader:()=>({read:()=>++count===1?Promise.resolve({value:new Uint8Array([1]),done:false}):Promise.reject(failure),cancel:()=>Promise.resolve()})};
 const f=fixture({stream}), errors=[];
 const attached=attachProgressiveAudio({browser:f.browser,audio:{},stream,onError:error=>errors.push(error)});
 f.open();await attached.ready;await flush();assert.deepEqual(errors,[failure]);assert.deepEqual(f.revoked,['mock:stream']);
 attached.close();assert.equal(f.revoked.length,1);
});
test('cancellation while append is pending aborts buffer and removes listeners', async () => {
 const f=fixture({stallAppend:true}), abort=new AbortController();
 const attached=attachProgressiveAudio({browser:f.browser,audio:{},stream:f.stream,signal:abort.signal,onError(){throw new Error('unexpected');}});
 const rejected=assert.rejects(attached.ready,{name:'AbortError'});f.open();await flush();abort.abort();await rejected;await flush();
 assert.equal(f.buffer().aborted,true);assert.equal(f.cancelCount(),1);assert.deepEqual(f.revoked,['mock:stream']);
});
test('completion releases a real ReadableStream reader before idempotent cleanup', async () => {
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1]));controller.close();}});
 const f=fixture({stream});const attached=attachProgressiveAudio({browser:f.browser,audio:{},stream,onError(){throw new Error('unexpected');}});
 f.open();await attached.ready;await flush();assert.equal(stream.locked,false);assert.equal(f.source().ended,true);
 attached.close();attached.close();assert.deepEqual(f.revoked,['mock:stream']);
});
