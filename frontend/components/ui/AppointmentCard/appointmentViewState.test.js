import assert from "node:assert/strict";
import test from "node:test";
import { getAppointmentsResultKey, getAppointmentsResultMotion, hasActiveAppointmentFilters } from "./appointmentViewState.js";
import * as appointmentState from "./appointmentViewState.js";

test("detecta filtros activos sin depender del rol", () => {
    assert.equal(hasActiveAppointmentFilters("todas", { paciente: "", fecha: "" }), false);
    assert.equal(hasActiveAppointmentFilters("confirmada", {}), true);
    assert.equal(hasActiveAppointmentFilters("todas", { paciente: "  Ana  " }), true);
});

test("la transición compartida nunca reduce la opacidad", () => {
    const motion = getAppointmentsResultMotion(false);
    assert.equal(motion.initial.opacity, 1);
    assert.equal(motion.animate.opacity, 1);
    assert.equal("exit" in motion, false);
});

test("reduced motion mantiene el contenido visible y estático", () => {
    assert.deepEqual(getAppointmentsResultMotion(true), {
        initial: false,
        animate: { opacity: 1, transform: "translateY(0px)" },
        transition: { duration: 0 },
    });
});

test("la clave solo depende de los resultados", () => {
    assert.equal(getAppointmentsResultKey([{ id: 7 }, { id: 9 }], 2), "2-7-9");
    assert.equal(getAppointmentsResultKey([], 0), "0-empty");
});

test("las acciones del paciente separan reprogramar de cancelar", () => {
    assert.equal(typeof appointmentState.getPatientAppointmentActionKeys, "function");
    assert.deepEqual(appointmentState.getPatientAppointmentActionKeys("pendiente"), ["reprogramar", "cancelar"]);
    assert.deepEqual(appointmentState.getPatientAppointmentActionKeys("confirmada"), ["reprogramar", "cancelar"]);
    assert.deepEqual(appointmentState.getPatientAppointmentActionKeys("reprogramada"), ["reprogramar", "cancelar"]);
    assert.deepEqual(appointmentState.getPatientAppointmentActionKeys("completada"), []);
    assert.deepEqual(appointmentState.getPatientAppointmentActionKeys("cancelada"), []);
});

test("construye la fecha de Colombia sin desplazar el día", () => {
    assert.equal(typeof appointmentState.getBogotaDateInputValue, "function");
    assert.equal(typeof appointmentState.buildBogotaAppointmentDateTime, "function");
    assert.equal(
        appointmentState.getBogotaDateInputValue(new Date("2026-10-06T02:30:00Z")),
        "2026-10-05"
    );
    assert.equal(
        appointmentState.buildBogotaAppointmentDateTime("2026-10-08", "09:30"),
        "2026-10-08T09:30:00-05:00"
    );
});

test("solo permite confirmar un horario vigente y evita dobles envíos", () => {
    assert.equal(typeof appointmentState.canSubmitReprogram, "function");
    const horarios = [{ hora_inicio: "09:30", hora_fin: "10:00" }];

    assert.equal(appointmentState.canSubmitReprogram({ fecha: "2026-10-08", hora: "09:30", horarios }), true);
    assert.equal(appointmentState.canSubmitReprogram({ fecha: "2026-10-08", hora: "10:00", horarios }), false);
    assert.equal(appointmentState.canSubmitReprogram({ fecha: "", hora: "09:30", horarios }), false);
    assert.equal(appointmentState.canSubmitReprogram({ fecha: "2026-10-08", hora: "09:30", horarios, cargando: true }), false);
    assert.equal(appointmentState.canSubmitReprogram({ fecha: "2026-10-08", hora: "09:30", horarios, guardando: true }), false);
});
