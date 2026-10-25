import test from "node:test";
import assert from "node:assert/strict";
import { positiveAppointmentId, matchesAppointmentTarget, appointmentLinkError } from "./appointmentTarget.js";

test("notification targets accept only canonical safe positive IDs", () => {
 for (const value of [null,"","0","-2","1.2","1e3"," 1","01","9007199254740992","../3"]) assert.equal(positiveAppointmentId(value),null,value);
 assert.equal(positiveAppointmentId("312"),312);
});
test("detail responses must match appointment and linked history", () => {
 assert.equal(matchesAppointmentTarget({id:12,historial_id:7},12,7),true);
 assert.equal(matchesAppointmentTarget({id:13,historial_id:7},12,7),false);
 assert.equal(matchesAppointmentTarget({id:12,historial_id:8},12,7),false);
 assert.equal(matchesAppointmentTarget({id:12},12),true);
});
test("unavailable and forbidden targets explain why without leaking appointment data", () => {
 assert.match(appointmentLinkError(403),/permiso/);
 assert.match(appointmentLinkError(404),/disponible/);
 assert.match(appointmentLinkError(500),/conexión/);
});

