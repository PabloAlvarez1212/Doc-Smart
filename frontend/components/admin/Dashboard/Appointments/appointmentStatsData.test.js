import test from "node:test";
import assert from "node:assert/strict";

import { hasAppointmentsByWeekday } from "./appointmentStatsData.js";

test("considera vacío un conjunto de siete días con totales en cero", () => {
    const days = [
        "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
    ].map((dia) => ({ dia, total_citas: 0 }));

    assert.equal(hasAppointmentsByWeekday(days), false);
});

test("mantiene la gráfica completa cuando al menos un día tiene citas", () => {
    const days = [
        { dia: "Lunes", total_citas: 0 },
        { dia: "Martes", total_citas: 2 },
        { dia: "Miércoles", total_citas: 0 },
        { dia: "Jueves", total_citas: 0 },
        { dia: "Viernes", total_citas: 0 },
        { dia: "Sábado", total_citas: 0 },
        { dia: "Domingo", total_citas: 0 },
    ];

    assert.equal(hasAppointmentsByWeekday(days), true);
    assert.equal(days.length, 7);
});
