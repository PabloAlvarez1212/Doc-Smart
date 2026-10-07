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

const mobileListLayout = /@media\s*\(max-width:\s*430px\)[^{]*\{[\s\S]*?\.list\s*>\s*\[role="list"\]\s*\{[^}]*display:\s*grid;[^}]*gap:\s*14px;/;

test("paciente separa las citas con gap solamente en el breakpoint movil", () => {
    assert.match(patientStyles, mobileListLayout);
});

test("medico separa las citas con el mismo gap movil", () => {
    assert.match(doctorStyles, mobileListLayout);
});
