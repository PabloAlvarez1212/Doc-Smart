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
