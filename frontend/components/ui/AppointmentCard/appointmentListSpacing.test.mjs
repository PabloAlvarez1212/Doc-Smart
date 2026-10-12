import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const patientStyles = readFileSync(
    new URL("../../patient/MyAppointments/AppointmentList/Appointment.module.css", import.meta.url),
    "utf8"
);
const doctorStyles = readFileSync(
    new URL("../../doctor/MyAppointments/AppointmentList/DoctorAppointmentList.module.css", import.meta.url),
    "utf8"
);
const cardStyles = readFileSync(
    new URL("./AppointmentCard.module.css", import.meta.url),
    "utf8"
);
const cardSource = readFileSync(
    new URL("./AppointmentCard.js", import.meta.url),
    "utf8"
);

const desktopCardGrid = /\.list\s*>\s*\[role="list"\]\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*align-items:\s*stretch;[^}]*gap:\s*18px;/;
const compactCardGrid = /@media\s*\(max-width:\s*900px\)[^{]*\{[\s\S]*?\.list\s*>\s*\[role="list"\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/;
const mobileListGap = /@media\s*\(max-width:\s*430px\)[^{]*\{[\s\S]*?\.list\s*>\s*\[role="list"\]\s*\{[^}]*gap:\s*14px;/;

test("paciente presenta las citas como una grilla responsive de cards", () => {
    assert.match(patientStyles, desktopCardGrid);
    assert.match(patientStyles, compactCardGrid);
    assert.match(patientStyles, mobileListGap);
});

test("medico reutiliza el mismo criterio responsive de cards", () => {
    assert.match(doctorStyles, desktopCardGrid);
    assert.match(doctorStyles, compactCardGrid);
    assert.match(doctorStyles, mobileListGap);
});

test("AppointmentCard es una superficie independiente y no conserva encabezado de tabla", () => {
    assert.match(cardStyles, /\.item\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*height:\s*100%;[^}]*border:\s*1px solid #dce5ee;[^}]*border-radius:\s*15px;/);
    assert.match(cardStyles, /\.actions\s*\{[^}]*margin-top:\s*auto;/s);
    assert.match(cardStyles, /@media\s*\(max-width:\s*900px\)[^{]*\{[\s\S]*?\.item\s*\{[^}]*height:\s*auto;/);
    assert.doesNotMatch(cardSource, /AppointmentListHeader/);
    assert.doesNotMatch(cardStyles, /\.listHeader/);
});
