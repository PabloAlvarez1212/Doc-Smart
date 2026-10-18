import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("asistencia compara cantidades y conserva porcentajes del backend", () => {
    const source = read("./GraficaAsistencia/GraficaAsistencia.js");
    const styles = read("./GraficaAsistencia/GraficaAsistencia.module.css");

    assert.match(source, /BarChart/);
    assert.match(source, /dataKey="estado"/);
    assert.match(source, /dataKey="cantidad"/);
    assert.match(source, /porcentaje/);
    assert.match(source, /allowDecimals=\{false\}/);
    assert.match(source, /No hay datos de asistencia en el período seleccionado/);
    assert.match(styles, /min-width:\s*0/);
});

test("demanda conserva los siete días cuando existe actividad", () => {
    const source = read("./GraficaDemanda/GraficaDemanda.js");
    const styles = read("./GraficaDemanda/GraficaDemanda.module.css");

    assert.match(source, /BarChart/);
    assert.match(source, /dataKey="dia"/);
    assert.match(source, /dataKey="cantidad"/);
    assert.match(source, /data\.some/);
    assert.doesNotMatch(source, /data\.filter/);
    assert.match(source, /No hay citas programadas por día en el período seleccionado/);
    assert.match(styles, /overflow-x:\s*auto/);
});
