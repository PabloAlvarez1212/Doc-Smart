import test from "node:test";
import assert from "node:assert/strict";

import { buildNonApprovedSpecialtyData } from "./doctorSpecialtyData.js";

test("agrupa los estados de validación por especialidad sin mezclarlos", () => {
    const result = buildNonApprovedSpecialtyData([
        { especialidad: "Cardiología", estado: "pendiente", total_medicos: 2 },
        { especialidad: "Cardiología", estado: "rechazado", total_medicos: 1 },
        { especialidad: "Cardiología", estado: "sin_solicitud", total_medicos: 3 },
        { especialidad: "Pediatría", estado: "pendiente", total_medicos: 4 },
    ]);

    assert.deepEqual(result, [
        {
            especialidad: "Cardiología",
            pendiente: 2,
            rechazado: 1,
            sin_solicitud: 3,
        },
        {
            especialidad: "Pediatría",
            pendiente: 4,
            rechazado: 0,
            sin_solicitud: 0,
        },
    ]);
});

test("normaliza cantidades inválidas y omite estados no soportados", () => {
    const result = buildNonApprovedSpecialtyData([
        { especialidad: "Neurología", estado: "pendiente", total_medicos: "2" },
        { especialidad: "Neurología", estado: "rechazado", total_medicos: -3 },
        { especialidad: "Neurología", estado: "aprobado", total_medicos: 8 },
    ]);

    assert.deepEqual(result, [
        {
            especialidad: "Neurología",
            pendiente: 2,
            rechazado: 0,
            sin_solicitud: 0,
        },
    ]);
});
