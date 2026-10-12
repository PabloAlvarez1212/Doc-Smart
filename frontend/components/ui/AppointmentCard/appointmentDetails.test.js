import assert from "node:assert/strict";
import test from "node:test";

const details = await import("./appointmentDetails.js").catch(() => ({}));

test("preserva el código real y descarta valores vacíos", () => {
    assert.equal(typeof details.getAppointmentCode, "function");
    assert.equal(details.getAppointmentCode("DOC-A7K92P4X"), "DOC-A7K92P4X");
    assert.equal(details.getAppointmentCode("   "), "");
    assert.equal(details.getAppointmentCode(null), "");
});

test("preserva el motivo original y detecta motivos sin contenido", () => {
    assert.equal(typeof details.getAppointmentReason, "function");
    assert.equal(
        details.getAppointmentReason("Primera línea\nSegunda línea"),
        "Primera línea\nSegunda línea"
    );
    assert.equal(details.getAppointmentReason(" \n "), "");
});

test("copia exactamente el código recibido", async () => {
    assert.equal(typeof details.copyAppointmentCode, "function");
    const values = [];
    const clipboard = {
        writeText: async (value) => values.push(value),
    };

    const copied = await details.copyAppointmentCode("DOC-A7K92P4X", clipboard);

    assert.equal(copied, true);
    assert.deepEqual(values, ["DOC-A7K92P4X"]);
});

test("maneja la ausencia o el fallo del portapapeles sin lanzar errores", async () => {
    assert.equal(typeof details.copyAppointmentCode, "function");
    assert.equal(await details.copyAppointmentCode("", null), false);
    assert.equal(
        await details.copyAppointmentCode("DOC-A7K92P4X", {
            writeText: async () => {
                throw new Error("permiso denegado");
            },
        }),
        false
    );
});
