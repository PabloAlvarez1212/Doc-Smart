import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeToday, nextAppointment, appointmentDate, filterToday } from './homeData.mjs';
test('daily summary includes cancelled appointments in total without calling them pending',()=>{assert.deepEqual(summarizeToday([{estado:'Confirmada'},{estado:'pendiente'},{estado:'Completada'},{estado:'Cancelada'}]),{total:4,pendientes:1,confirmadas:1,completadas:1});});
test('empty day is explicit',()=>assert.deepEqual(summarizeToday(),{total:0,pendientes:0,confirmadas:0,completadas:0}));
test('next consultation is earliest actionable appointment without mutating API array',()=>{const data=[{id:2,estado:'Confirmada',fecha_programada:'2026-10-19T15:00:00Z'},{id:1,estado:'Pendiente',fecha_programada:'2026-10-19T14:00:00Z'},{id:3,estado:'Cancelada',fecha_programada:'2026-10-19T12:00:00Z'}];assert.equal(nextAppointment(data).id,1);assert.equal(data[0].id,2);assert.equal(nextAppointment([]),null);});
test('appointment times consistently use Colombian timezone',()=>assert.match(appointmentDate('2026-10-19T14:00:00Z',true),/9:00|09:00/));

test('agenda filters case-insensitively and preserves the original response', () => {
  const data = [{ id: 2, estado: 'Pendiente', fecha_programada: '2026-10-19T16:00:00Z' }, { id: 1, estado: 'Confirmada', fecha_programada: '2026-10-19T14:00:00Z' }];
  assert.deepEqual(filterToday(data, 'pendiente').map(item => item.id), [2]);
  assert.deepEqual(filterToday(data).map(item => item.id), [1, 2]);
  assert.deepEqual(filterToday(data, 'completada'), []);
  assert.equal(data[0].id, 2);
});
