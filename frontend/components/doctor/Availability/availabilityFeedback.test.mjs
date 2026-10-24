import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleErrors,errorText} from './availabilityFeedback.mjs';
test('ranges reject missing values and reversed times beside their block',()=>{assert.match(scheduleErrors([{hora_inicio:'12:00',hora_fin:'08:00'}])[0],/posterior/);assert.match(scheduleErrors([{hora_inicio:'',hora_fin:'12:00'}])[0],/Completa/);});
test('overlap identifies both affected blocks, while adjacent ranges remain valid',()=>{const blocks=[{hora_inicio:'08:00',hora_fin:'12:00'},{hora_inicio:'11:00',hora_fin:'14:00'}];assert.ok(scheduleErrors(blocks).every(Boolean));blocks[1].hora_inicio='12:00';assert.deepEqual(scheduleErrors(blocks),['','']);});
test('backend nested errors remain readable without losing specific instructions',()=>{assert.equal(errorText({horarios:[{hora_fin:['Debe ser posterior.']},'No pueden solaparse.']}),'Debe ser posterior. No pueden solaparse.');assert.equal(errorText(null),'');});
