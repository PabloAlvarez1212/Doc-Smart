import test from "node:test";
import assert from "node:assert/strict";

import { buildSpecialtyMetric } from "./summarySpecialtyMetrics.js";

test("distingue el total de citas creadas del total de citas programadas", () => {
    assert.deepEqual(
        buildSpecialtyMetric(
            { especialidad: "Cardiología", total_citas: 24 },
            "creada"
        ),
        {
            especialidad: "Cardiología",
            total: 24,
            textoTotal: "24 citas creadas",
        }
    );

    assert.deepEqual(
        buildSpecialtyMetric(
            { especialidad: "Cirugía", total_citas: 1 },
            "programada"
        ),
        {
            especialidad: "Cirugía",
            total: 1,
            textoTotal: "1 cita programada",
        }
    );
});

test("devuelve un estado vacío para métricas sin especialidad o sin citas", () => {
    assert.equal(
        buildSpecialtyMetric(
            { especialidad: null, total_citas: 0 },
            "creada"
        ),
        null
    );
    assert.equal(
        buildSpecialtyMetric(
            { especialidad: "   ", total_citas: 3 },
            "programada"
        ),
        null
    );
    assert.equal(
        buildSpecialtyMetric(
            { especialidad: "Pediatría", total_citas: 0 },
            "creada"
        ),
        null
    );
});
