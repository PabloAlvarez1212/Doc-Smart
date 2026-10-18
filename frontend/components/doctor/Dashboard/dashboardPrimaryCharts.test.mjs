import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("evolución presenta dos series y formatea fechas sin desplazamiento horario", () => {
    const source = read("./GraficaEvolucion/GraficaEvolucion.js");
    const styles = read("./GraficaEvolucion/GraficaEvolucion.module.css");

    assert.match(source, /ResponsiveContainer/);
    assert.match(source, /LineChart/);
    assert.match(source, /dataKey="programadas"/);
    assert.match(source, /dataKey="completadas"/);
    assert.match(source, /Tooltip/);
    assert.match(source, /Legend/);
    assert.match(source, /allowDecimals=\{false\}/);
    assert.doesNotMatch(source, /new Date\(\s*(value|periodo)/);
    assert.match(source, /No hay citas registradas en el período seleccionado/);
    assert.match(styles, /min-width:\s*0/);
});

test("estados presenta dona, total y desglose textual accesible", () => {
    const source = read("./GraficaEstados/GraficaEstados.js");
    const styles = read("./GraficaEstados/GraficaEstados.module.css");

    assert.match(source, /PieChart/);
    assert.match(source, /innerRadius=/);
    assert.match(source, /dataKey="cantidad"/);
    assert.match(source, /porcentaje/);
    assert.match(source, /Total de citas/);
    assert.match(source, /className=\{styles\.legend\}/);
    assert.match(source, /No hay citas por estado en el período seleccionado/);
    assert.match(styles, /grid-template-columns:/);
});
