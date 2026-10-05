import assert from "node:assert/strict";
import test from "node:test";

import { getNotificationPresentation, getNotificationReadState } from "./notificationPresentation.js";

test("normaliza los tipos reales en una familia visual calmada", () => {
    assert.equal(getNotificationPresentation("cita_confirmada").icon, "calendar-check");
    assert.equal(getNotificationPresentation("cita_cancelada").icon, "calendar-x");
    assert.equal(getNotificationPresentation("mensaje_nuevo").icon, "message");
    assert.equal(getNotificationPresentation("tipo_desconocido").icon, "bell");
});

test("el estado de lectura siempre tiene una etiqueta textual", () => {
    assert.deepEqual(getNotificationReadState(false), { key: "unread", label: "Nueva" });
    assert.deepEqual(getNotificationReadState(true), { key: "read", label: "Leída" });
});
