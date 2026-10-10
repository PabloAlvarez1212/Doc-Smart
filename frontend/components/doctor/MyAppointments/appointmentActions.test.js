import assert from "node:assert/strict";
import test from "node:test";

import { getDoctorAppointmentActionKeys } from "./appointmentActions.js";

test("mantiene las acciones actuales de las citas pendientes y reprogramadas", () => {
    assert.deepEqual(
        getDoctorAppointmentActionKeys("pendiente"),
        ["reprogramar", "cancelar", "confirmar"]
    );
    assert.deepEqual(
        getDoctorAppointmentActionKeys("reprogramada"),
        ["reprogramar", "cancelar", "confirmar"]
    );
});

test("mantiene las acciones actuales de una cita confirmada", () => {
    assert.deepEqual(
        getDoctorAppointmentActionKeys("confirmada"),
        ["reprogramar", "cancelar", "completar"]
    );
});

test("no ofrece acciones para estados terminales o desconocidos", () => {
    assert.deepEqual(getDoctorAppointmentActionKeys("cancelada"), []);
    assert.deepEqual(getDoctorAppointmentActionKeys("completada"), []);
    assert.deepEqual(getDoctorAppointmentActionKeys("desconocido"), []);
});

test("documentos posteriores solo dentro del plazo, sin acciones en vencida", () => {
    const now = Date.parse('2026-10-09T15:00:00Z');
    assert.deepEqual(getDoctorAppointmentActionKeys('completada', {fecha_limite_cierre: '2026-10-09T16:00:00Z'}, now), ['documentos']);
    assert.deepEqual(getDoctorAppointmentActionKeys('completada', {fecha_limite_cierre: '2026-10-09T15:00:00Z'}, now), []);
    assert.deepEqual(getDoctorAppointmentActionKeys('vencida', {fecha_limite_cierre: '2026-10-10T15:00:00Z'}, now), []);
});
