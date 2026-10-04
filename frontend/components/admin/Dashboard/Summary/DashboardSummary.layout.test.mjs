import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(
    new URL("./DashboardSummary.module.css", import.meta.url),
    "utf8"
);

function ruleBody(selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));

    assert.ok(match, `No se encontró la regla ${selector}`);
    return match[1];
}

test("la vista de resumen no estira la tarjeta de actividad a la altura de la columna lateral", () => {
    const chartArea = ruleBody(".chartArea");

    assert.match(
        stylesheet,
        /\.overviewGrid\s*\{[^}]*align-items:\s*(?:start|flex-start)\s*;/s
    );
    assert.doesNotMatch(chartArea, /margin-top:\s*auto\s*;/);
});
