// Real Edge/MediaSource playback over a local delayed MP3 server. No app auth/provider latency.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const baseline=process.argv.includes('--baseline');
const refFlag=process.argv.indexOf('--baseline-ref');
const baselineRef=refFlag<0?'0387c23b00ea190680d52e7125e9841897c823e7':process.argv[refFlag+1];
const originalController=baseline?execFileSync('git',['show',baselineRef+':frontend/components/bymax/bymaxVoiceController.mjs'],{encoding:'utf8'}):null;
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/kleid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=resolve('frontend/components/bymax');
const flag=process.argv.indexOf('--audio');
const mp3=await readFile(flag<0?resolve(tmpdir(),'bymax-synthetic-browser.mp3'):process.argv[flag+1]);
const chunkBytes=4096, chunkDelayMs=120;
const server=createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local Bymax audio verification</title>');return;}
 if(req.url.startsWith('/audio')){
  res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store'});
  let offset=0;const timer=setInterval(()=>{if(offset>=mp3.length){clearInterval(timer);res.end();return;}res.write(mp3.subarray(offset,offset+chunkBytes));offset+=chunkBytes;},chunkDelayMs);
  res.on('close',()=>clearInterval(timer));return;
 }
 try{const name=req.url.slice(1);if(!/^bymax\w+\.mjs$/.test(name))throw Error();res.setHeader('Content-Type','text/javascript');res.end(baseline&&name==='bymaxVoiceController.mjs'?originalController:await readFile(resolve(root,name)));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true,timeout:15000,args:['--autoplay-policy=no-user-gesture-required']});
 const results=[];
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  const page=await browser.newPage({viewport});await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result=await page.evaluate(async(baseline)=>{
   const {createBymaxVoiceController}=await import('/bymaxVoiceController.mjs');
   const origin=performance.now(),events=[];const record=(kind,detail={})=>events.push({kind,atMs:+(performance.now()-origin).toFixed(2),...detail});
   let activeId;let originalPlay=Audio.prototype.play;
   if(baseline)Audio.prototype.play=function(){const id=activeId;this.addEventListener('playing',()=>record('playing',{id}),{once:true});this.addEventListener('ended',()=>record('ended',{id}),{once:true});return originalPlay.call(this);};
   const metrics=e=>record(e.detail.event,{id:e.detail.response_id});window.addEventListener('bymax:audio-timing',metrics);
   let request=0;
   const create=()=>createBymaxVoiceController({browser:window,generateVoice:async(text,rate,signal)=>{
    const id=++request;record('fetchStart',{id,text});const response=await fetch('/audio?request='+id,{signal});if(baseline){const blob=await response.blob();record('fetchComplete',{id});return blob;}const reader=response.body.getReader();
    return {stream:new ReadableStream({async pull(controller){try{const value=await reader.read();if(value.done){record('fetchComplete',{id});controller.close();reader.releaseLock();}else controller.enqueue(value.value);}catch(error){controller.error(error);}},cancel(){record('fetchCancel',{id});return reader.cancel();}})};
   },notify(state){if(state.messageId)activeId=state.messageId;},onTranscript(){},onPartial(){},onWake(){}});
   const waitFor=async(predicate,timeout=60000)=>{const end=performance.now()+timeout;while(!predicate()){if(performance.now()>end)throw new Error('Playback timeout: '+JSON.stringify(events));await new Promise(resolve=>setTimeout(resolve,20));}};
   const controller=create();controller.beginTurn();controller.enqueue('Primera frase sintética.','response');controller.enqueue('Segunda frase sintética.','response');controller.completeTurn();
   await waitFor(()=>events.filter(e=>e.kind==='ended').length===2);controller.dispose();
   const normal=events.splice(0);const playing=normal.filter(e=>e.kind==='playing');
   if(playing.length!==2||playing.some(e=>e.id!=='response'))throw new Error('Incorrect response identity');
   const requested=normal.filter(e=>e.kind==='fetchStart').map(e=>e.text);if(requested.join('|')!=='Primera frase sintética.|Segunda frase sintética.')throw new Error('Incorrect segment request order');
   playing.forEach((event,index)=>{event.segmentIndex=index;});normal.filter(e=>e.kind==='ended').forEach((event,index)=>{event.segmentIndex=index;});
   const firstEnd=normal.find(e=>e.kind==='ended');if(playing[1].atMs<firstEnd.atMs)throw new Error('Overlapping segments');
   const firstFetchEnd=normal.find(e=>e.kind==='fetchComplete'&&e.id===1);if(!firstFetchEnd||(!baseline&&playing[0].atMs>=firstFetchEnd.atMs)||(baseline&&playing[0].atMs<firstFetchEnd.atMs))throw new Error('Unexpected audio/download timing');
   const cancelled=create();cancelled.beginTurn();cancelled.enqueue('Cancelar esta prueba.','cancel');cancelled.enqueue('No debe escucharse.','late');
   await waitFor(()=>events.some(e=>e.kind==='playing'));record('cancel');cancelled.stopPlayback();const cancelAt=events.find(e=>e.kind==='cancel').atMs;
   await new Promise(resolve=>setTimeout(resolve,700));if(events.some(e=>e.kind==='playing'&&e.atMs>cancelAt))throw new Error('Late playback after cancellation');
   cancelled.dispose();if(baseline)Audio.prototype.play=originalPlay;window.removeEventListener('bymax:audio-timing',metrics);
   return {userAgent:navigator.userAgent,mpegSupported:MediaSource.isTypeSupported('audio/mpeg'),firstPlayingMs:playing[0].atMs,firstFetchCompleteMs:firstFetchEnd.atMs,gapMs:+(playing[1].atMs-firstEnd.atMs).toFixed(2),orderVerified:true,noOverlapVerified:true,cancellationVerified:true,normal,cancellation:events};
  },baseline);
  results.push({viewport,...result});await page.close();
 }
 const report={baseline,baselineGitRef:baseline?baselineRef:null,segmentModel:'Two ordered fragments sharing the same response ID; segmentIndex follows playback sequence. Same delayed local MP3 transfer for before/after. Baseline replays recorded Git revision after implementation.',kind:'REAL_BROWSER_LOCAL_SYNTHETIC_AUDIO',measuredAt:new Date().toISOString(),model:'Real Edge Audio.onplaying, real controller and MediaSource, locally served valid synthetic MP3 with delayed chunks. No production auth, live provider/network latency, microphone, or user experience claim. Host under concurrent build/test load; timings not an SLA.',fixture:{bytes:mp3.length,chunkBytes,chunkDelayMs},results};
 const output=resolve(baseline?'docs/benchmarks/bymax/browser-before.json':'docs/benchmarks/bymax/browser.json');await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,results:results.map(({viewport,firstPlayingMs,firstFetchCompleteMs,gapMs,cancellationVerified})=>({viewport,firstPlayingMs,firstFetchCompleteMs,gapMs,cancellationVerified}))},null,2));
}finally{server.closeAllConnections();await browser?.close();await new Promise(resolve=>server.close(resolve));}
