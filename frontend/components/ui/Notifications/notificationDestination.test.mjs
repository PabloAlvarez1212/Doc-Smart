import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationDestination } from './notificationDestination.mjs';

test('uses typed real IDs for each role and never message keywords', () => {
    assert.equal(notificationDestination({tipo:'cita',id:12,mensaje:'historial http://evil.test'},'patient'),'/patient/my-appointments?cita=12');
    assert.equal(notificationDestination({tipo:'conversacion',id:3},'doctor'),'/doctor/my-chats/3');
    assert.equal(notificationDestination({tipo:'historial',id:8},'patient'),'/patient/my-medical-history?historial=8');
    assert.equal(notificationDestination({tipo:'historial',id:8,cita_id:12},'doctor'),'/doctor/my-appointments?historial=8&cita=12');
});
test('rejects unsafe IDs, destinations and roles', () => {
    for (const id of [0,-1,1.5,'1/../../admin','01','https://evil.test',null]) assert.throws(()=>notificationDestination({tipo:'cita',id},'patient'));
    assert.throws(()=>notificationDestination({tipo:'cita',id:1,ruta:'https://evil.test'},'patient'));
    assert.throws(()=>notificationDestination({tipo:'cita',id:1,ruta:'/doctor/my-appointments?cita=1'},'patient'));
    assert.throws(()=>notificationDestination({tipo:'unknown',id:1},'patient'));
    assert.throws(()=>notificationDestination({tipo:'cita',id:1},'admin'));
    assert.throws(()=>notificationDestination({tipo:'historial',id:1},'doctor'));
});
