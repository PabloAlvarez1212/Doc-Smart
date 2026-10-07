import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("./AppointmentCard.module.css", import.meta.url), "utf8");
const doctorList = readFileSync(
    new URL("../../doctor/MyAppointments/AppointmentList/DoctorAppointmentList.js", import.meta.url),
    "utf8"
);

test("tres acciones usan dos columnas equilibradas bajo la acción principal", () => {
    assert.match(
        styles,
        /\.actionButtons\[data-action-count="3"\]\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s
    );
    assert.match(
        styles,
        /\.actionButtons\[data-action-count="3"\]\s+:is\(\.primary,\s*\.success\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s
    );
});

test("en pantallas muy estrechas las tres acciones vuelven a una columna", () => {
    assert.match(
        styles,
        /@media\s*\(max-width:\s*350px\)[^{]*\{[\s\S]*?\.actionButtons\[data-action-count="3"\]\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
});

test("confirmar y completar conservan variantes e iconos visualmente distintos", () => {
    assert.doesNotMatch(styles, /\.primary\s*,\s*\.success\s*\{/);
    assert.match(styles, /\.primary\s*\{[^}]*background:\s*#2456a6/s);
    assert.match(styles, /\.success\s*\{[^}]*background:\s*#17664e/s);
    assert.match(doctorList, /confirmar:\s*\{[\s\S]*?icon:\s*CircleCheck,[\s\S]*?tone:\s*"primary"/);
    assert.match(doctorList, /completar:\s*\{[\s\S]*?icon:\s*ClipboardCheck,[\s\S]*?tone:\s*"success"/);
});

test("las acciones mantienen una escala compacta con un target tactil suficiente en movil", () => {
    assert.match(
        styles,
        /\.actionButton\s*\{[^}]*min-height:\s*36px;[^}]*padding:\s*6px 9px;[^}]*font-size:\s*\.74rem;/s
    );
    assert.match(
        styles,
        /\.actionButton svg\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;/s
    );
    assert.match(
        styles,
        /@media\s*\(max-width:\s*430px\)[^{]*\{[\s\S]*?\.actionButton\s*\{[^}]*min-height:\s*42px;/s
    );
});
