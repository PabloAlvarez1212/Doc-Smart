import test from "node:test";
import assert from "node:assert/strict";

import { getSpecialtyChartMinWidth } from "./specialtyChartSizing.js";

test("reserva área legible para etiquetas y barras en pantallas estrechas", () => {
    assert.equal(getSpecialtyChartMinWidth(76), 340);
    assert.equal(getSpecialtyChartMinWidth(132), 352);
});

test("normaliza anchos de eje inválidos", () => {
    assert.equal(getSpecialtyChartMinWidth(undefined), 340);
    assert.equal(getSpecialtyChartMinWidth(-20), 340);
});
