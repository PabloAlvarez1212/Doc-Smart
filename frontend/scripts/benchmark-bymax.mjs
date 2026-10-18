import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createBymaxVoiceController } from '../components/bymax/bymaxVoiceController.mjs';
import { takeSpeechUnits } from '../components/bymax/bymaxSpeechUnits.mjs';
const fixture = { deltaDelayMs:35, ttsCompleteBlobMs:80, audioStartMs:8, playbackMs:95, confirmationDelayMs:110 };
const scenarios = [
{name:'normal',deltas:['Puedo ayudarte con una explicación extensa, ','incluyendo los pasos necesarios ','para organizar tu consulta ','y encontrar una respuesta clara ','sin perder detalles. ','Ahora revisamos el siguiente paso.']},
{name:'datos',deltas:['Tus datos ','se revisan con cuidado. ','La cifra es 12.5 ','y el Dr. Pérez ','puede revisarla. ','Estos son los datos finales.']},
{name:'cita_confirmada',confirmation:true,deltas:['La solicitud ','está en proceso, ','espera la respuesta ','del sistema ','antes de confirmar. ','Tu cita quedó confirmada.']},
{name:'cancelacion',cancelAtMs:255,deltas:['Primera frase. ','Segunda frase. ','Tercera frase. ','Cuarta frase. ','Quinta frase. ','Sexta frase.']}
];
async function run(s) {
 const origin=performance.now(), now=()=>+(performance.now()-origin).toFixed(2), events=[], spoken=[], timers=new Set(), urls=new Map();
 let firstTextMs=null, firstAudioMs=null, completeTextMs=null, buffer='', visible='', cancelled=false, pending=0, abortedRequests=0;
 const schedule=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
 class Audio {
  play(){const text=urls.get(this.src);this.start=schedule(()=>{firstAudioMs??=now();spoken.push(text);events.push({kind:'playing',atMs:now(),text});this.onplaying?.();this.end=schedule(()=>{events.push({kind:'ended',atMs:now()});this.onended?.();},fixture.playbackMs);},fixture.audioStartMs);return Promise.resolve();}
  pause(){clearTimeout(this.start);clearTimeout(this.end);} removeAttribute(){} load(){}
 }
 const controller=createBymaxVoiceController({browser:{Audio,setTimeout:schedule,clearTimeout,performance,URL:{createObjectURL(blob){const id=`mock:${urls.size}`;urls.set(id,blob.textValue);return id;},revokeObjectURL(){}}},generateVoice:(text,rate,signal)=>new Promise((res,rej)=>{pending++;events.push({kind:'tts_request',atMs:now(),text});const timer=schedule(()=>{pending--;const blob=new Blob(['mock'],{type:'audio/mpeg'});blob.textValue=text;res(blob);},fixture.ttsCompleteBlobMs);signal.addEventListener('abort',()=>{if(!timers.has(timer))return;clearTimeout(timer);timers.delete(timer);pending--;abortedRequests++;rej(new DOMException('Cancelled','AbortError'));},{once:true});}),notify(){},onTranscript(){},onPartial(){},onWake(){}});
 controller.beginTurn();
 if(s.cancelAtMs)schedule(()=>{cancelled=true;events.push({kind:'cancel',atMs:now()});controller.stopPlayback();},s.cancelAtMs);
 for(let i=0;i<s.deltas.length;i++){
  await sleep(fixture.deltaDelayMs);if(cancelled)break;
  if(s.confirmation&&i===s.deltas.length-1){await sleep(fixture.confirmationDelayMs);events.push({kind:'controlled_confirmation',atMs:now()});}
  const delta=s.deltas[i];visible+=delta;buffer+=delta;firstTextMs??=now();const result=takeSpeechUnits(buffer);buffer=result.remaining;for(const unit of result.units)controller.enqueue(unit,s.name);
 }
 if(!cancelled){for(const unit of takeSpeechUnits(buffer,true).units)controller.enqueue(unit,s.name);completeTextMs=now();controller.completeTurn();}
 const deadline=performance.now()+3000;
 while(performance.now()<deadline&&(pending||!['idle','stopped'].includes(controller.snapshot().playback)))await sleep(10);
 assert(performance.now()<deadline,'playback did not settle');
 if(!cancelled){assert.equal(visible,s.deltas.join(''));assert.equal(spoken.join(' ').replace(/\s+/g,' ').trim(),visible.replace(/\s+/g,' ').trim(),'speech omitted or repeated');}
 else assert(!events.some(e=>e.kind==='playing'&&e.atMs>events.find(e=>e.kind==='cancel').atMs));
 const gapsMs=[];let end;for(const e of events){if(e.kind==='ended')end=e.atMs;if(e.kind==='playing'&&end!==undefined){gapsMs.push(+(e.atMs-end).toFixed(2));end=undefined;}}
 controller.dispose();for(const timer of timers)clearTimeout(timer);
 return {scenario:s.name,firstTextMs,firstAudioMs,completeTextMs,gapsMs,cancelled,abortedRequests,exactFinalTextChecked:!cancelled,noRepetitionChecked:!cancelled,visibleText:visible,events};
}
const results=[];for(const scenario of scenarios)results.push(await run(scenario));
const report={kind:'SIMULATION_ONLY',measuredAt:new Date().toISOString(),nodeVersion:process.version,model:'Real segmentation/controller; synthetic delayed text deltas; TTS resolves complete Blob; mock Audio.onplaying and fixed playback duration. Node timer jitter applies. Not real network/model/TTS/browser/audio latency. Confirmation is a controlled fixture, not backend verification.',fixture,results};
const flag=process.argv.indexOf('--output'),output=resolve(flag>=0?process.argv[flag+1]:'docs/benchmarks/bymax/baseline.json');
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,kind:report.kind,results:results.map(({scenario,firstTextMs,firstAudioMs,completeTextMs,gapsMs,abortedRequests})=>({scenario,firstTextMs,firstAudioMs,completeTextMs,gapsMs,abortedRequests}))},null,2));
