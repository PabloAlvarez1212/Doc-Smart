import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hookUrl = new URL("./useDashboardMedico.js", import.meta.url);

test("el hook centraliza servicio, respuesta y errores seguros", () => {
    const source = readFileSync(hookUrl, "utf8");

    assert.match(source, /obtenerEstadisticasMedicoService/);
    assert.match(source, /obtenerPrimerError/);
    assert.match(source, /respuesta\?\.data/);
    assert.match(source, /grafica_citas:\s*normalizarLista/);
    assert.doesNotMatch(source, /fetch\s*\(/);
    assert.doesNotMatch(source, /error\.message/);
});

test("el hook valida fechas reales antes de consultar", () => {
    const source = readFileSync(hookUrl, "utf8");
    const periodSource = readFileSync(new URL("./dashboardPeriodFilters.js", import.meta.url), "utf8");

    assert.match(source, /obtenerRangoPeriodo/);
    assert.match(periodSource, /validarFechaISO/);
    assert.match(periodSource, /La fecha inicial es obligatoria/);
    assert.match(periodSource, /La fecha final es obligatoria/);
    assert.match(periodSource, /La fecha inicial no puede ser posterior/);
    assert.match(periodSource, /Date\.UTC/);
});

test("el hook separa carga inicial, actualización y solicitudes obsoletas", () => {
    const source = readFileSync(hookUrl, "utf8");

    assert.match(source, /\[loading,\s*setLoading\]/);
    assert.match(source, /\[updating,\s*setUpdating\]/);
    assert.match(source, /requestIdRef/);
    assert.match(source, /appliedFiltersRef/);
    assert.match(source, /busyRef/);
    assert.match(source, /aplicarFiltros/);
    assert.match(source, /restablecerFiltros/);
    assert.match(source, /retry/);
});
