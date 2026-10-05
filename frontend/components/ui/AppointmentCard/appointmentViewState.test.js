import assert from "node:assert/strict";
import test from "node:test";
import { getAppointmentsResultKey, getAppointmentsResultMotion, hasActiveAppointmentFilters } from "./appointmentViewState.js";

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
