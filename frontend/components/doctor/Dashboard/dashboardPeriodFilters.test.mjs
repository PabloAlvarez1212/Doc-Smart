import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
    PERIOD_TYPES,
    crearFiltrosIniciales,
    obtenerRangoPeriodo,
} from "./dashboardPeriodFilters.js";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("año completo produce el primer y último día del año", () => {
    assert.deepEqual(
        obtenerRangoPeriodo({ tipo_periodo: PERIOD_TYPES.YEAR, anio: "2026" }),
        { fecha_inicio: "2026-01-01", fecha_fin: "2026-12-31", errores: {} },
    );
});

test("mes específico calcula correctamente febrero en años bisiestos y comunes", () => {
    assert.deepEqual(
        obtenerRangoPeriodo({ tipo_periodo: PERIOD_TYPES.MONTH, anio: "2024", mes: "2" }),
        { fecha_inicio: "2024-02-01", fecha_fin: "2024-02-29", errores: {} },
    );
    assert.deepEqual(
        obtenerRangoPeriodo({ tipo_periodo: PERIOD_TYPES.MONTH, anio: "2025", mes: "2" }),
        { fecha_inicio: "2025-02-01", fecha_fin: "2025-02-28", errores: {} },
    );
});

test("personalizado conserva las fechas y valida el orden", () => {
    assert.deepEqual(
        obtenerRangoPeriodo({
            tipo_periodo: PERIOD_TYPES.CUSTOM,
            anio: "2026",
            mes: "10",
            fecha_inicio: "2026-10-01",
            fecha_fin: "2026-10-17",
        }),
        { fecha_inicio: "2026-10-01", fecha_fin: "2026-10-17", errores: {} },
    );

    const invalid = obtenerRangoPeriodo({
        tipo_periodo: PERIOD_TYPES.CUSTOM,
        fecha_inicio: "2026-10-20",
        fecha_fin: "2026-10-01",
    });
    assert.equal(invalid.errores.fecha_fin, "La fecha inicial no puede ser posterior a la fecha final.");
});

test("el estado inicial y restablecido utiliza el año actual", () => {
    assert.deepEqual(crearFiltrosIniciales(2026), {
        tipo_periodo: PERIOD_TYPES.YEAR,
        anio: "2026",
        mes: "1",
        fecha_inicio: "",
        fecha_fin: "",
    });
});

test("el hook transforma filtros solo al aplicar o restablecer", () => {
    const source = read("./useDashboardMedico.js");

    assert.match(source, /obtenerRangoPeriodo\(filtros\)/);
    assert.match(source, /crearFiltrosIniciales/);
    assert.match(source, /aplicarFiltros/);
    assert.match(source, /restablecerFiltros/);
    assert.doesNotMatch(source, /cambiarFiltro[\s\S]{0,500}cargarDatos/);
});

test("el formulario ofrece los tres modos y renderiza controles condicionales", () => {
    const source = read("./FiltrosDashboard/FiltrosDashboard.js");

    assert.match(source, /Año completo/);
    assert.match(source, /Mes específico/);
    assert.match(source, /Personalizado/);
    assert.match(source, /MONTHS_ES/);
    assert.match(source, /tipo_periodo/);
    assert.match(source, /filtros\.tipo_periodo === PERIOD_TYPES\.CUSTOM/);
    assert.match(source, /filtros\.tipo_periodo === PERIOD_TYPES\.MONTH/);
});
