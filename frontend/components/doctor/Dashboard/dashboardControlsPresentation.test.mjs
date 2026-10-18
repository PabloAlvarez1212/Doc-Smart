import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("los filtros son accesibles y solo delegan acciones", () => {
    const source = read("./FiltrosDashboard/FiltrosDashboard.js");
    const styles = read("./FiltrosDashboard/FiltrosDashboard.module.css");

    assert.equal((source.match(/type="date"/g) || []).length, 2);
    assert.match(source, /aria-describedby=/);
    assert.match(source, /Aplicar filtros/);
    assert.match(source, /Restablecer/);
    assert.match(source, /onApply/);
    assert.match(source, /onReset/);
    assert.match(source, /disabled=\{updating\}/);
    assert.match(styles, /min-height:\s*44px/);
    assert.match(styles, /:focus-visible/);
});

test("las tarjetas muestran los cuatro indicadores reales", () => {
    const source = read("./EstadisticasCards/EstadisticasCards.js");
    const styles = read("./EstadisticasCards/EstadisticasCards.module.css");

    for (const key of [
        "total_programadas",
        "total_completadas",
        "total_inasistencias",
        "porcentaje_asistencia",
    ]) {
        assert.match(source, new RegExp(key));
    }

    assert.match(source, /Intl\.NumberFormat\("es-CO"/);
    assert.match(source, /lucide-react/);
    assert.match(styles, /grid-template-columns:\s*repeat\(4/);
    assert.match(styles, /grid-template-columns:\s*repeat\(2/);
    assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
