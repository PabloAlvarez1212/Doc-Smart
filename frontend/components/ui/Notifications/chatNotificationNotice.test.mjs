import test from 'node:test';
import assert from 'node:assert/strict';
import { isChatNotification, chatNotificationNotice } from './chatNotificationNotice.mjs';

test('only the real chat event enables navigation, regardless of message keywords', () => {
    assert.equal(isChatNotification({tipo:'mensaje_nuevo'}),true);
    for (const tipo of ['cita_reprogramada','cita_completada','historial_creado','unknown',undefined]) {
        assert.equal(isChatNotification({tipo,mensaje:'Mensaje nuevo en el chat'}),false);
    }
});
test('missing and forbidden conversations use a friendly notice without leaking technical errors', () => {
    for (const status of [403,404,410]) {
        assert.equal(chatNotificationNotice({response:{status},message:'Request failed'}).title,'Conversación no disponible');
    }
    assert.equal(chatNotificationNotice({message:'Request failed with status code 500'}).title,'No pudimos abrir el chat');
    assert.ok(!JSON.stringify(chatNotificationNotice({})).includes('Request failed'));
});
