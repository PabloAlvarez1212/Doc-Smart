import assert from "node:assert/strict";
import test from "node:test";

import {
    getAppointmentsResultKey,
    getAppointmentsResultMotion,
    hasActiveAppointmentFilters,
} from "./appointmentsViewState.js";

test("distingue una búsqueda filtrada del estado inicial sin citas", () => {
    const emptyFilters = {
        doctor: "",
        ciudad: "",
        departamento: "",
        especialidad: "",
        fecha_programada: "",
    };

    assert.equal(hasActiveAppointmentFilters("todas", emptyFilters), false);
    assert.equal(hasActiveAppointmentFilters("confirmada", emptyFilters), true);
    assert.equal(
        hasActiveAppointmentFilters("todas", { ...emptyFilters, doctor: "  García  " }),
        true
    );
});

test("la transición de resultados nunca reduce la opacidad del listado", () => {
    const motion = getAppointmentsResultMotion(false);

    assert.equal(motion.initial.opacity, 1);
    assert.equal(motion.animate.opacity, 1);
    assert.equal("exit" in motion, false);
    assert.equal(motion.transition.duration, 0.16);
});

test("el movimiento reducido mantiene el contenido estático y completamente visible", () => {
    assert.deepEqual(getAppointmentsResultMotion(true), {
        initial: false,
        animate: { opacity: 1, transform: "translateY(0px)" },
        transition: { duration: 0 },
    });
});

test("la clave cambia con los resultados recibidos y no con los controles del filtro", () => {
    assert.equal(getAppointmentsResultKey([{ id: 7 }, { id: 9 }], 2), "2-7-9");
    assert.equal(getAppointmentsResultKey([], 0), "0-empty");
});
