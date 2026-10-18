import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
    new URL("../../../src/app/doctor/dashboard/page.js", import.meta.url),
    "utf8",
);
const styles = readFileSync(
    new URL("../../../src/app/doctor/dashboard/dashboard.module.css", import.meta.url),
    "utf8",
);

test("la página compone el dashboard desde una única instancia del hook", () => {
    assert.match(page, /useDashboardMedico\(\)/);
    assert.equal((page.match(/useDashboardMedico\(\)/g) ?? []).length, 1);
    assert.match(page, /FiltrosDashboard/);
    assert.match(page, /EstadisticasCards/);
    assert.match(page, /GraficaEvolucion/);
    assert.match(page, /GraficaEstados/);
    assert.match(page, /GraficaAsistencia/);
    assert.match(page, /GraficaDemanda/);
    assert.match(page, /<h1>Dashboard médico<\/h1>/);
    assert.doesNotMatch(page, /mock|fixture|Math\.random/i);
});

test("la página diferencia carga inicial, actualización y error recuperable", () => {
    assert.match(page, /loading/);
    assert.match(page, /updating/);
    assert.match(page, /role="status"/);
    assert.match(page, /role="alert"/);
    assert.match(page, /onClick=\{retry\}/);
    assert.match(page, /skeleton/);
});

test("el layout usa una cuadrícula responsive sin overflow horizontal", () => {
    assert.match(styles, /grid-template-columns:\s*repeat\(2,/);
    assert.match(styles, /minmax\(0,\s*1fr\)/);
    assert.match(styles, /overflow-x:\s*(clip|hidden)/);
    assert.match(styles, /@media\s*\(max-width:/);
});
