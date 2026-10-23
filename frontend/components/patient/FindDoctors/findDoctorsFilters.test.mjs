import assert from "node:assert/strict";
import test from "node:test";

import { buildFindDoctorsParams, hasFindDoctorsFilters } from "./findDoctorsFilters.js";

test("combina la calificacion minima numerica con los filtros existentes", () => {
    assert.deepEqual(buildFindDoctorsParams({
        search: "García",
        especialidad: "3",
        departamento: "5",
        ciudad: "12",
        calificacionMinima: "4.5",
    }), {
        search: "García",
        especialidad: "3",
        departamento: "5",
        ciudad: "12",
        calificacion_minima: 4.5,
    });
});

test("omite la calificacion minima y los demas filtros cuando estan vacios", () => {
    assert.deepEqual(buildFindDoctorsParams({
        search: "",
        especialidad: "",
        departamento: "",
        ciudad: "",
        calificacionMinima: "",
    }), {});
});

test("solo permite valores de calificacion entre uno y cinco", () => {
    assert.deepEqual(buildFindDoctorsParams({ calificacionMinima: "0" }), {});
    assert.deepEqual(buildFindDoctorsParams({ calificacionMinima: "6" }), {});
    assert.deepEqual(buildFindDoctorsParams({ calificacionMinima: "valor-invalido" }), {});
});

test("detecta la calificacion como filtro activo", () => {
    assert.equal(hasFindDoctorsFilters({ calificacionMinima: "4.5" }), true);
    assert.equal(hasFindDoctorsFilters({ calificacionMinima: "" }), false);
});
