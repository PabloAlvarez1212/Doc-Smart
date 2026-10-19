import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatSession } from './chatSession.mjs';
function fixture(role='paciente') {
 const peer={tipo:role==='paciente'?'medico':'paciente',id:2};
 const session=createChatSession({id:7,role,api:{detalle:async()=>({id:7,estado:'activo',otro_participante:peer,cita:{id:1,estado:'confirmada'}}),historial:async()=>({results:[],has_more:false})}});
 return {session,peer};
}
for (const role of ['medico','paciente']) test(`${role}: presencia solo del interlocutor confirmado, desconexión local no inventa ausencia`,async()=>{
 const {session,peer}=fixture(role);await session.refresh();
 assert.equal(session.getSnapshot().remotePresence,null);
 session.connection('connected');assert.equal(session.getSnapshot().remotePresence,null);
 for(const data of [{actor:{tipo:role,id:2},online:true},{actor:{...peer,id:8},online:true},{actor:peer,online:'true'}])session.receive('chat.presence',data);
 assert.equal(session.getSnapshot().remotePresence,null);
 session.receive('chat.presence',{actor:peer,online:true});assert.equal(session.getSnapshot().remotePresence,'online');
 session.receive('chat.presence',{actor:peer,online:false});assert.equal(session.getSnapshot().remotePresence,'offline');
 session.connection('reconnecting');assert.equal(session.getSnapshot().remotePresence,null);
 session.connection('connected');assert.equal(session.getSnapshot().remotePresence,null);
 session.receive('chat.presence',{actor:peer,online:true});assert.equal(session.getSnapshot().remotePresence,'online');
 session.connection('offline');assert.equal(session.getSnapshot().remotePresence,null);session.dispose();
});

test('la presencia caduca a neutral si el servidor deja de confirmar, incluso con transporte abierto',async()=>{
 const timers=new Map();let serial=0;
 const session=createChatSession({id:7,role:'paciente',setTimer:(fn,delay)=>{const key=++serial;timers.set(key,{fn,delay});return key;},clearTimer:key=>timers.delete(key),api:{detalle:async()=>({id:7,estado:'activo',otro_participante:{tipo:'medico',id:2},cita:{id:1,estado:'confirmada'}}),historial:async()=>({results:[],has_more:false})}});
 await session.refresh();session.connection('connected');
 session.receive('chat.presence',{actor:{tipo:'medico',id:2},online:true});
 const original=[...timers.keys()][0];session.confirmPresence();assert.equal(timers.has(original),false);
 const watchdog=[...timers.values()].find(timer=>timer.delay===65000);assert.ok(watchdog);watchdog.fn();
 assert.equal(session.getSnapshot().remotePresence,null);assert.equal(session.getSnapshot().connection,'connected');
 session.confirmPresence();assert.equal(session.getSnapshot().remotePresence,'online');session.connection('disconnected');session.confirmPresence();assert.equal(session.getSnapshot().remotePresence,null);session.dispose();
});
