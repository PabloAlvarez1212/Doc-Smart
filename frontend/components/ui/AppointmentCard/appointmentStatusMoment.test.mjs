import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppointmentStatusMoment } from './appointmentDetails.js';

test('uses real timestamps for each resolved state and the new scheduled date for reschedules', () => {
    const at = '2026-08-27T03:31:00Z';
    for (const [estado,field,label] of [
        ['completada','fecha_completada','Completada el'],
        ['cancelada','fecha_cancelacion','Cancelada el'],
        ['vencida','fecha_vencimiento','Vencida el'],
        ['reprogramada','fecha_programada','Reprogramada para'],
    ]) assert.deepEqual(getAppointmentStatusMoment({estado,[field]:at}),{label,at});
    assert.equal(getAppointmentStatusMoment({estado:'completada',fecha_final:at}).at,at);
});
test('does not invent a resolution date from creation or scheduled dates', () => {
    for (const estado of ['completada','cancelada','vencida','confirmada']) {
        assert.equal(getAppointmentStatusMoment({estado,fecha_programada:'2026-08-27T03:31:00Z'}),null);
    }
    assert.equal(getAppointmentStatusMoment({estado:'completada',fecha_completada:'invalid'}),null);
});
